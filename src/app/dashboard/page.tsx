import { getServerUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const user = await getServerUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return <DashboardClient user={user} />
}