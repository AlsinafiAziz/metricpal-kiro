import { NextRequest, NextResponse } from 'next/server'
import { createServiceSupabaseClient } from '@/lib/supabase-server'
import { createWorkspaceForUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, workspaceName } = await request.json()

    if (!email || !password || !workspaceName) {
      return NextResponse.json(
        { error: 'Email, password, and workspace name are required' },
        { status: 400 }
      )
    }

    const supabase = createServiceSupabaseClient()

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm for development
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user' },
        { status: 400 }
      )
    }

    // Create workspace for the user
    try {
      const workspaceId = await createWorkspaceForUser(authData.user.id, workspaceName)
      
      return NextResponse.json({
        user: authData.user,
        workspaceId,
        message: 'User and workspace created successfully'
      })
    } catch (workspaceError) {
      // If workspace creation fails, we should clean up the user
      await supabase.auth.admin.deleteUser(authData.user.id)
      
      return NextResponse.json(
        { error: `Failed to create workspace: ${workspaceError}` },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}