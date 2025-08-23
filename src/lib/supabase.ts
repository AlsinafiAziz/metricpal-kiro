import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Types for database tables
export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          name: string
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          api_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          api_key?: string
          created_at?: string
          updated_at?: string
        }
      }
      workspace_members: {
        Row: {
          id: string
          workspace_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          workspace_id: string
          user_id: string
          role?: string
          created_at?: string
        }
        Update: {
          id?: string
          workspace_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
    }
    Functions: {
      create_workspace_for_user: {
        Args: {
          workspace_name: string
          user_id: string
        }
        Returns: string
      }
      generate_api_key: {
        Args: {}
        Returns: string
      }
    }
  }
}