'use client'

import { createClient } from './supabase'
import { User } from '@supabase/supabase-js'

export interface AuthUser extends User {
  workspace?: {
    id: string
    name: string
    api_key: string
    role: string
  }
}

export interface SignUpData {
  email: string
  password: string
  workspaceName: string
}

export interface SignInData {
  email: string
  password: string
}

// Client-side auth functions
export async function signUp({ email, password, workspaceName }: SignUpData) {
  const supabase = createClient()
  
  // Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    throw new Error(authError?.message || 'Failed to create user')
  }

  // If user is confirmed immediately, create workspace
  if (authData.user && !authData.user.email_confirmed_at) {
    // User needs to confirm email first
    return { 
      user: authData.user, 
      needsEmailConfirmation: true,
      workspace: null 
    }
  }

  // Create workspace using service client (this will be called via API route)
  return { 
    user: authData.user, 
    needsEmailConfirmation: false,
    workspace: null // Will be created after email confirmation
  }
}

export async function signIn({ email, password }: SignInData) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  
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