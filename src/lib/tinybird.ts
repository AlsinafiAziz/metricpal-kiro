import crypto from 'crypto'

type TinybirdEvent = {
  timestamp: string
  workspace_id: string
  visitor_id: string
  session_id: string
  action_type: string
  url: string
  element?: string
  text?: string
  value?: string
  properties?: string
  user_agent: string
  referrer: string
  email_hash?: string
  email_domain?: string
}

type TinybirdIdentity = {
  workspace_id: string
  visitor_id: string
  email_hash: string
  email_domain: string
  identified_at: string
  properties?: string
}

export class TinybirdClient {
  private apiUrl: string
  private token: string

  constructor() {
    const token = process.env.TINYBIRD_TOKEN
    if (!token) {
      throw new Error('TINYBIRD_TOKEN environment variable is required')
    }
    this.token = token
    this.apiUrl = process.env.TINYBIRD_API_URL || 'https://api.tinybird.co'
  }

  async sendEvents(events: TinybirdEvent[]): Promise<void> {
    if (!events || events.length === 0) return

    // Send as NDJSON to avoid JSON array quarantine
    const ndjson = events.map(e => JSON.stringify(e)).join('\n') + '\n'
    const res = await fetch(`${this.apiUrl}/v0/events?name=website_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-ndjson'
      },
      body: ndjson
    })

    if (!res.ok) {
      const body = await safeReadText(res)
      throw new Error(`Tinybird API error: ${res.status} ${res.statusText} - ${body}`)
    }
  }

  async sendUserIdentities(identities: TinybirdIdentity[]): Promise<void> {
    if (!identities || identities.length === 0) return

    const ndjson = identities.map(i => JSON.stringify(i)).join('\n') + '\n'
    const res = await fetch(`${this.apiUrl}/v0/events?name=user_identities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/x-ndjson'
      },
      body: ndjson
    })

    if (!res.ok) {
      const body = await safeReadText(res)
      throw new Error(`Tinybird API error: ${res.status} ${res.statusText} - ${body}`)
    }
  }

  async queryEvents<T = any>(pipeName: string, params: Record<string, string>): Promise<T> {
    const qs = new URLSearchParams(params).toString()
    const url = `${this.apiUrl}/v0/pipes/${pipeName}.json${qs ? `?${qs}` : ''}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
    if (!res.ok) {
      const body = await safeReadText(res)
      throw new Error(`Tinybird API error: ${res.status} ${res.statusText} - ${body}`)
    }
    return res.json() as Promise<T>
  }

  async testConnection(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/v0/datasources`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      })
      return res.ok
    } catch {
      return false
    }
  }
}

let singletonClient: TinybirdClient | null = null
export function getTinybirdClient(): TinybirdClient {
  if (!singletonClient) {
    singletonClient = new TinybirdClient()
  }
  return singletonClient
}

function safeReadText(res: Response): Promise<string> {
  return res.text().catch(() => '')
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

function extractEmailDomain(email: string): string | undefined {
  const at = email.indexOf('@')
  if (at === -1) return undefined
  return email.substring(at + 1).toLowerCase()
}

export function transformToTinybirdEvents(
  workspaceId: string,
  payload: any
): { events: TinybirdEvent[]; identities: TinybirdIdentity[] } {
  const user = payload?.userObject || {}
  const visitorId: string = user?.uuid || 'unknown'
  const sessionId: string = user?.sessionData?.id || 'unknown'
  const userAgent: string = user?.platform || 'unknown'
  const referrer: string = payload?.referrer || ''

  const actionLog: any[] = Array.isArray(payload?.actionLog) ? payload.actionLog : []

  const events: TinybirdEvent[] = []
  const identities: TinybirdIdentity[] = []

  for (const action of actionLog) {
    const base: TinybirdEvent = {
      timestamp: String(action.timestamp || new Date().toISOString()),
      workspace_id: workspaceId,
      visitor_id: visitorId,
      session_id: sessionId,
      action_type: String(action.action_type),
      url: String(action.url || ''),
      user_agent: userAgent,
      referrer
    }

    if (action.element != null) base.element = action.element
    if (action.text != null) base.text = action.text
    if (action.value != null) base.value = String(action.value)

    if (action.properties != null) {
      base.properties = JSON.stringify(action.properties)
    }

    // Extract identity if email present in properties for identify and form submit (or any event carrying email)
    const email: string | undefined = action.properties?.email
    if (email) {
      const emailHash = sha256Hex(email.toLowerCase().trim())
      const domain = extractEmailDomain(email)
      base.email_hash = emailHash
      if (domain) base.email_domain = domain

      identities.push({
        workspace_id: workspaceId,
        visitor_id: visitorId,
        email_hash: emailHash,
        email_domain: domain || '',
        identified_at: base.timestamp,
        properties: JSON.stringify(action.properties)
      })
    }

    events.push(base)
  }

  return { events, identities }
}


