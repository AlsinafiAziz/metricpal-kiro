'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut, AuthUser } from '@/lib/auth-client'

interface DashboardClientProps {
  user: AuthUser
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
      router.push('/auth/signin')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                MetricPal Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {isSigningOut ? 'Signing Out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to MetricPal!
              </h2>
              <p className="text-gray-600 mb-6">
                Your authentication is working correctly.
              </p>
              
              {user.workspace && (
                <div className="bg-white p-6 rounded-lg shadow max-w-md mx-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Workspace Information
                  </h3>
                  <div className="space-y-2 text-left">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <span className="ml-2 text-gray-900">{user.workspace.name}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Role:</span>
                      <span className="ml-2 text-gray-900">{user.workspace.role}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">API Key:</span>
                      <span className="ml-2 text-gray-900 font-mono text-sm">
                        {user.workspace.api_key}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}