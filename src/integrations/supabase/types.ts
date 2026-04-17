export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          cool_person_response: boolean | null
          created_at: string | null
          email: string
          id: string
          name: string
          onboard_path: string | null
          room_selected: string | null
          status: string | null
          what_building: string | null
        }
        Insert: {
          cool_person_response?: boolean | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          onboard_path?: string | null
          room_selected?: string | null
          status?: string | null
          what_building?: string | null
        }
        Update: {
          cool_person_response?: boolean | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          onboard_path?: string | null
          room_selected?: string | null
          status?: string | null
          what_building?: string | null
        }
        Relationships: []
      }
      admin_settings: {
        Row: {
          auto_yolo_enabled: boolean | null
          id: number
          updated_at: string | null
        }
        Insert: {
          auto_yolo_enabled?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Update: {
          auto_yolo_enabled?: boolean | null
          id?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      channels: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: string
          is_public_visible: boolean | null
          name: string
          slug: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public_visible?: boolean | null
          name: string
          slug: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_public_visible?: boolean | null
          name?: string
          slug?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          recipient_id: string
          related_id: string | null
          type: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id: string
          related_id?: string | null
          type: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          recipient_id?: string
          related_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          request_id: string
          sender_type: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          request_id: string
          sender_type: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          request_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "access_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          channel_id: string
          content: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          title: string | null
          type: string | null
          url: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          channel_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          channel_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          title?: string | null
          type?: string | null
          url?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_links: {
        Row: {
          created_at: string
          id: string
          label: string
          profile_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          profile_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          profile_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          id: string
          is_admin: boolean | null
          is_approved: boolean | null
          links: Json | null
          what_building: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          id: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          links?: Json | null
          what_building?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_admin?: boolean | null
          is_approved?: boolean | null
          links?: Json | null
          what_building?: string | null
        }
        Relationships: []
      }
      project_updates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          project_id: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          project_id: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          project_id?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          title: string
          user_id: string
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          title: string
          user_id: string
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          title?: string
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_visibility_requests: {
        Row: {
          created_at: string | null
          direction: string
          id: string
          initiator_id: string
          post_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          direction: string
          id?: string
          initiator_id: string
          post_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          direction?: string
          id?: string
          initiator_id?: string
          post_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_visibility_requests_initiator_id_fkey"
            columns: ["initiator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "public_visibility_requests_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          emoji: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          content: string
          created_at: string | null
          id: string
          status: string | null
          user_id: string
          visibility: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id: string
          visibility?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string
          visibility?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "member"
      member_tier: "learner" | "founder"
      post_type: "text" | "link" | "video" | "doc"
      request_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "member"],
      member_tier: ["learner", "founder"],
      post_type: ["text", "link", "video", "doc"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
