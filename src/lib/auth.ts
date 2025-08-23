import { createServerSupabaseClient, createServiceSupabaseClient } from './supabase-server'
import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  workspace?: {
    id: string
    name: string
    api_key: string
    role: string
  }
}

// Server-side auth functions
export async function getServerUser(): Promise<AuthUser | null> {
  const supabase = await createServerSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  // Get user's workspace information
  const { data: workspaceData } = await supabase
    .from('workspace_members')
    .select(`
      role,
      workspaces (
        id,
        name,
        api_key
      )
    `)
    .eq('user_id', user.id)
    .single()

  const authUser: AuthUser = {
    ...user,
    workspace: workspaceData?.workspaces ? {
      id: (workspaceData as any).workspaces.id,
      name: (workspaceData as any).workspaces.name,
      api_key: (workspaceData as any).workspaces.api_key,
      role: workspaceData.role
    } : undefined
  }

  return authUser
}



// Server-side function to create workspace (called from API route)
export async function createWorkspaceForUser(userId: string, workspaceName: string) {
  const supabase = createServiceSupabaseClient()
  
  const { data, error } = await supabase.rpc('create_workspace_for_user', {
    workspace_name: workspaceName,
    user_id: userId
  })

  if (error) {
    throw new Error(`Failed to create workspace: ${error.message}`)
  }

  return data
}