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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_lock_settings: {
        Row: {
          created_at: string | null
          id: string
          is_enabled: boolean | null
          pin_hash: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          pin_hash: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          pin_hash?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          id: string
          is_required: boolean
          release_notes: string | null
          released_at: string
          version: string
        }
        Insert: {
          id?: string
          is_required?: boolean
          release_notes?: string | null
          released_at?: string
          version: string
        }
        Update: {
          id?: string
          is_required?: boolean
          release_notes?: string | null
          released_at?: string
          version?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      bookmarks: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_commands: {
        Row: {
          cooldown_seconds: number
          created_at: string
          id: string
          is_enabled: boolean
          response: string
          trigger: string
          updated_at: string
          user_id: string
          uses_count: number
        }
        Insert: {
          cooldown_seconds?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          response: string
          trigger: string
          updated_at?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          cooldown_seconds?: number
          created_at?: string
          id?: string
          is_enabled?: boolean
          response?: string
          trigger?: string
          updated_at?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      co_stream_requests: {
        Row: {
          created_at: string
          from_user_id: string
          game: string | null
          id: string
          message: string | null
          scheduled_at: string | null
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          game?: string | null
          id?: string
          message?: string | null
          scheduled_at?: string | null
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          game?: string | null
          id?: string
          message?: string | null
          scheduled_at?: string | null
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      coin_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      comment_likes: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      connected_platforms: {
        Row: {
          access_token: string | null
          connected_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_missions: {
        Row: {
          action_type: string
          coin_reward: number
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          target_count: number
          title: string
          xp_reward: number
        }
        Insert: {
          action_type: string
          coin_reward?: number
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          target_count?: number
          title: string
          xp_reward?: number
        }
        Update: {
          action_type?: string
          coin_reward?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          target_count?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      draft_posts: {
        Row: {
          content: string | null
          created_at: string
          id: string
          image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      hashtag_daily_usage: {
        Row: {
          daily_count: number
          hashtag_id: string
          id: string
          usage_date: string
        }
        Insert: {
          daily_count?: number
          hashtag_id: string
          id?: string
          usage_date?: string
        }
        Update: {
          daily_count?: number
          hashtag_id?: string
          id?: string
          usage_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "hashtag_daily_usage_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
        ]
      }
      hashtags: {
        Row: {
          created_at: string
          id: string
          name: string
          use_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          use_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          use_count?: number
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          co_stream_requests_enabled: boolean
          created_at: string
          raids_enabled: boolean
          stream_reminders_enabled: boolean
          tournament_events_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          co_stream_requests_enabled?: boolean
          created_at?: string
          raids_enabled?: boolean
          stream_reminders_enabled?: boolean
          tournament_events_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          co_stream_requests_enabled?: boolean
          created_at?: string
          raids_enabled?: boolean
          stream_reminders_enabled?: boolean
          tournament_events_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          comment_id: string | null
          created_at: string
          from_user_id: string | null
          id: string
          is_read: boolean
          message: string
          post_id: string | null
          reel_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message: string
          post_id?: string | null
          reel_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          from_user_id?: string | null
          id?: string
          is_read?: boolean
          message?: string
          post_id?: string | null
          reel_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          coins_spent: number
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          coins_spent?: number
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          coins_spent?: number
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "stream_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_views: {
        Row: {
          id: string
          post_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_url: string | null
          is_private: boolean
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_private?: boolean
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_boosts: {
        Row: {
          boost_type: string
          coin_cost: number
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          started_at: string
          user_id: string
        }
        Insert: {
          boost_type?: string
          coin_cost?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id: string
        }
        Update: {
          boost_type?: string
          coin_cost?: number
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          started_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_qr_aliases: {
        Row: {
          alias: string
          alias_type: string
          created_at: string
          id: string
          profile_id: string
        }
        Insert: {
          alias: string
          alias_type?: string
          created_at?: string
          id?: string
          profile_id: string
        }
        Update: {
          alias?: string
          alias_type?: string
          created_at?: string
          id?: string
          profile_id?: string
        }
        Relationships: []
      }
      profile_views: {
        Row: {
          id: string
          profile_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          deactivated_at: string | null
          discord_url: string | null
          email: string | null
          full_name: string | null
          games: string[] | null
          gender: string | null
          header_url: string | null
          id: string
          is_deactivated: boolean
          kick_url: string | null
          last_seen: string | null
          last_seen_visibility: string | null
          looking_for_squad: boolean | null
          manual_verification_badge: string | null
          manual_verification_expires_at: string | null
          manual_verification_reason: string | null
          playstyle: string | null
          profile_visibility: string
          qr_handle: string
          rank: string | null
          referral_code: string | null
          region: string | null
          scheduled_deletion_at: string | null
          show_discord: boolean | null
          show_kick: boolean | null
          show_twitch: boolean | null
          show_youtube_gaming: boolean | null
          signup_number: number
          twitch_url: string | null
          updated_at: string | null
          username: string | null
          who_can_comment: string
          youtube_gaming_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          discord_url?: string | null
          email?: string | null
          full_name?: string | null
          games?: string[] | null
          gender?: string | null
          header_url?: string | null
          id: string
          is_deactivated?: boolean
          kick_url?: string | null
          last_seen?: string | null
          last_seen_visibility?: string | null
          looking_for_squad?: boolean | null
          manual_verification_badge?: string | null
          manual_verification_expires_at?: string | null
          manual_verification_reason?: string | null
          playstyle?: string | null
          profile_visibility?: string
          qr_handle: string
          rank?: string | null
          referral_code?: string | null
          region?: string | null
          scheduled_deletion_at?: string | null
          show_discord?: boolean | null
          show_kick?: boolean | null
          show_twitch?: boolean | null
          show_youtube_gaming?: boolean | null
          signup_number?: number
          twitch_url?: string | null
          updated_at?: string | null
          username?: string | null
          who_can_comment?: string
          youtube_gaming_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          discord_url?: string | null
          email?: string | null
          full_name?: string | null
          games?: string[] | null
          gender?: string | null
          header_url?: string | null
          id?: string
          is_deactivated?: boolean
          kick_url?: string | null
          last_seen?: string | null
          last_seen_visibility?: string | null
          looking_for_squad?: boolean | null
          manual_verification_badge?: string | null
          manual_verification_expires_at?: string | null
          manual_verification_reason?: string | null
          playstyle?: string | null
          profile_visibility?: string
          qr_handle?: string
          rank?: string | null
          referral_code?: string | null
          region?: string | null
          scheduled_deletion_at?: string | null
          show_discord?: boolean | null
          show_kick?: boolean | null
          show_twitch?: boolean | null
          show_youtube_gaming?: boolean | null
          signup_number?: number
          twitch_url?: string | null
          updated_at?: string | null
          username?: string | null
          who_can_comment?: string
          youtube_gaming_url?: string | null
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string | null
          fan_id: string
          id: string
          review_text: string | null
          stars: number
          streamer_id: string
        }
        Insert: {
          created_at?: string | null
          fan_id: string
          id?: string
          review_text?: string | null
          stars: number
          streamer_id: string
        }
        Update: {
          created_at?: string | null
          fan_id?: string
          id?: string
          review_text?: string | null
          stars?: number
          streamer_id?: string
        }
        Relationships: []
      }
      reel_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          parent_id: string | null
          reel_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          reel_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          parent_id?: string | null
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "reel_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_comments_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_hashtags: {
        Row: {
          created_at: string
          hashtag_id: string
          id: string
          reel_id: string
        }
        Insert: {
          created_at?: string
          hashtag_id: string
          id?: string
          reel_id: string
        }
        Update: {
          created_at?: string
          hashtag_id?: string
          id?: string
          reel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_hashtags_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reel_hashtags_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_likes: {
        Row: {
          created_at: string | null
          id: string
          reel_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reel_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reel_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reel_likes_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reel_views: {
        Row: {
          completed: boolean | null
          id: string
          reel_id: string
          user_id: string | null
          viewed_at: string
          watch_duration: number | null
        }
        Insert: {
          completed?: boolean | null
          id?: string
          reel_id: string
          user_id?: string | null
          viewed_at?: string
          watch_duration?: number | null
        }
        Update: {
          completed?: boolean | null
          id?: string
          reel_id?: string
          user_id?: string | null
          viewed_at?: string
          watch_duration?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reel_views_reel_id_fkey"
            columns: ["reel_id"]
            isOneToOne: false
            referencedRelation: "reels"
            referencedColumns: ["id"]
          },
        ]
      }
      reels: {
        Row: {
          caption: string | null
          created_at: string
          duration: number
          id: string
          updated_at: string
          user_id: string
          video_url: string
          view_count: number
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration?: number
          id?: string
          updated_at?: string
          user_id: string
          video_url: string
          view_count?: number
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration?: number
          id?: string
          updated_at?: string
          user_id?: string
          video_url?: string
          view_count?: number
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_expires_at: string | null
          reward_granted: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          referee_id: string
          referral_code: string
          referrer_id: string
          reward_expires_at?: string | null
          reward_granted?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          referee_id?: string
          referral_code?: string
          referrer_id?: string
          reward_expires_at?: string | null
          reward_granted?: boolean
        }
        Relationships: []
      }
      reminder_dispatch_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          errors: Json
          id: string
          run_at: string
          scanned: number
          sent: number
          skipped: number
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          id?: string
          run_at?: string
          scanned?: number
          sent?: number
          skipped?: number
          status?: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          errors?: Json
          id?: string
          run_at?: string
          scanned?: number
          sent?: number
          skipped?: number
          status?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_post_id: string | null
          reported_reel_id: string | null
          reported_user_id: string | null
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_post_id?: string | null
          reported_reel_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_post_id?: string | null
          reported_reel_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
        }
        Relationships: []
      }
      security_findings: {
        Row: {
          created_at: string
          description: string
          fixed_at: string | null
          id: string
          internal_id: string
          notes: string | null
          scanner: string
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          fixed_at?: string | null
          id?: string
          internal_id: string
          notes?: string | null
          scanner: string
          severity: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          fixed_at?: string | null
          id?: string
          internal_id?: string
          notes?: string | null
          scanner?: string
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      seller_subscriptions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          plan: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          plan?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          plan?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: []
      }
      seller_verifications: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_verified: boolean
          payment_amount: number
          user_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean
          payment_amount?: number
          user_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_verified?: boolean
          payment_amount?: number
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      squad_requests: {
        Row: {
          created_at: string
          expires_at: string
          game: string
          id: string
          is_active: boolean
          message: string | null
          playstyle: string | null
          rank: string | null
          region: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          game: string
          id?: string
          is_active?: boolean
          message?: string | null
          playstyle?: string | null
          rank?: string | null
          region?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          game?: string
          id?: string
          is_active?: boolean
          message?: string | null
          playstyle?: string | null
          rank?: string | null
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          category: string
          created_at: string
          description: string
          external_url: string | null
          id: string
          image_url: string
          images: string[] | null
          is_active: boolean
          name: string
          price: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string
          external_url?: string | null
          id?: string
          image_url?: string
          images?: string[] | null
          is_active?: boolean
          name: string
          price?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          external_url?: string | null
          id?: string
          image_url?: string
          images?: string[] | null
          is_active?: boolean
          name?: string
          price?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      stream_clips: {
        Row: {
          chapter_title: string | null
          clipper_id: string
          created_at: string
          game: string | null
          id: string
          platform: string
          reel_id: string | null
          source_streamer_id: string | null
          source_streamer_name: string | null
          stream_url: string
          timestamp_seconds: number | null
          title: string | null
        }
        Insert: {
          chapter_title?: string | null
          clipper_id: string
          created_at?: string
          game?: string | null
          id?: string
          platform: string
          reel_id?: string | null
          source_streamer_id?: string | null
          source_streamer_name?: string | null
          stream_url: string
          timestamp_seconds?: number | null
          title?: string | null
        }
        Update: {
          chapter_title?: string | null
          clipper_id?: string
          created_at?: string
          game?: string | null
          id?: string
          platform?: string
          reel_id?: string | null
          source_streamer_id?: string | null
          source_streamer_name?: string | null
          stream_url?: string
          timestamp_seconds?: number | null
          title?: string | null
        }
        Relationships: []
      }
      stream_polls: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          options: Json
          question: string
          status: string
          streamer_id: string
          total_coins_pool: number
          winning_option_index: number | null
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          options?: Json
          question: string
          status?: string
          streamer_id: string
          total_coins_pool?: number
          winning_option_index?: number | null
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          options?: Json
          question?: string
          status?: string
          streamer_id?: string
          total_coins_pool?: number
          winning_option_index?: number | null
        }
        Relationships: []
      }
      stream_raids: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          raider_count: number
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          raider_count?: number
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          raider_count?: number
          to_user_id?: string
        }
        Relationships: []
      }
      stream_schedule_reminders: {
        Row: {
          attempt_count: number
          created_at: string
          id: string
          last_error: string | null
          lead_minutes: number
          schedule_id: string
          sent_at: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lead_minutes?: number
          schedule_id: string
          sent_at?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          id?: string
          last_error?: string | null
          lead_minutes?: number
          schedule_id?: string
          sent_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_schedule_reminders_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "stream_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_schedules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          platform: string
          scheduled_at: string
          stream_url: string | null
          timezone: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          platform?: string
          scheduled_at: string
          stream_url?: string | null
          timezone?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          platform?: string
          scheduled_at?: string
          stream_url?: string | null
          timezone?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streamer_games: {
        Row: {
          cover_url: string | null
          created_at: string
          game_name: string
          id: string
          notes: string | null
          platform: string | null
          position: number
          rating: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          game_name: string
          id?: string
          notes?: string | null
          platform?: string | null
          position?: number
          rating?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          game_name?: string
          id?: string
          notes?: string | null
          platform?: string | null
          position?: number
          rating?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streamer_gear: {
        Row: {
          affiliate_url: string | null
          brand: string | null
          category: string
          created_at: string
          id: string
          image_url: string | null
          item_name: string
          notes: string | null
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          affiliate_url?: string | null
          brand?: string | null
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          item_name: string
          notes?: string | null
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          affiliate_url?: string | null
          brand?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          item_name?: string
          notes?: string | null
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      streaming_analytics: {
        Row: {
          chat_messages_count: number | null
          engagement_rate: number | null
          follower_count: number | null
          id: string
          is_live: boolean | null
          new_followers: number | null
          peak_viewers: number | null
          platform: string
          recorded_at: string
          stream_duration_minutes: number | null
          stream_title: string | null
          subscriber_count: number | null
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          chat_messages_count?: number | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          is_live?: boolean | null
          new_followers?: number | null
          peak_viewers?: number | null
          platform: string
          recorded_at?: string
          stream_duration_minutes?: number | null
          stream_title?: string | null
          subscriber_count?: number | null
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          chat_messages_count?: number | null
          engagement_rate?: number | null
          follower_count?: number | null
          id?: string
          is_live?: boolean | null
          new_followers?: number | null
          peak_viewers?: number | null
          platform?: string
          recorded_at?: string
          stream_duration_minutes?: number | null
          stream_title?: string | null
          subscriber_count?: number | null
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      tournament_match_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          match_id: string
          new_score_a: number | null
          new_score_b: number | null
          new_winner_team_id: string | null
          note: string | null
          old_score_a: number | null
          old_score_b: number | null
          old_winner_team_id: string | null
          tournament_id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          match_id: string
          new_score_a?: number | null
          new_score_b?: number | null
          new_winner_team_id?: string | null
          note?: string | null
          old_score_a?: number | null
          old_score_b?: number | null
          old_winner_team_id?: string | null
          tournament_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          match_id?: string
          new_score_a?: number | null
          new_score_b?: number | null
          new_winner_team_id?: string | null
          note?: string | null
          old_score_a?: number | null
          old_score_b?: number | null
          old_winner_team_id?: string | null
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_match_audit_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "tournament_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_match_audit_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_matches: {
        Row: {
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          id: string
          locked: boolean
          position: number
          round: number
          scheduled_at: string | null
          score_a: number | null
          score_b: number | null
          status: string
          team_a_id: string | null
          team_b_id: string | null
          tournament_id: string
          updated_at: string
          winner_team_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          locked?: boolean
          position: number
          round: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          id?: string
          locked?: boolean
          position?: number
          round?: number
          scheduled_at?: string | null
          score_a?: number | null
          score_b?: number | null
          status?: string
          team_a_id?: string | null
          team_b_id?: string | null
          tournament_id?: string
          updated_at?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_team_a_id_fkey"
            columns: ["team_a_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_team_b_id_fkey"
            columns: ["team_b_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "tournament_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_teams: {
        Row: {
          captain_user_id: string
          created_at: string
          id: string
          seed: number | null
          status: string
          team_name: string
          tournament_id: string
        }
        Insert: {
          captain_user_id: string
          created_at?: string
          id?: string
          seed?: number | null
          status?: string
          team_name: string
          tournament_id: string
        }
        Update: {
          captain_user_id?: string
          created_at?: string
          id?: string
          seed?: number | null
          status?: string
          team_name?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_teams_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          format: string
          game: string | null
          host_user_id: string
          id: string
          max_teams: number
          name: string
          prize: string | null
          starts_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          format?: string
          game?: string | null
          host_user_id: string
          id?: string
          max_teams?: number
          name: string
          prize?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          format?: string
          game?: string | null
          host_user_id?: string
          id?: string
          max_teams?: number
          name?: string
          prize?: string | null
          starts_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          badge_icon: string
          badge_name: string
          badge_type: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_icon?: string
          badge_name: string
          badge_type: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_icon?: string
          badge_name?: string
          badge_type?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_daily_missions: {
        Row: {
          claimed: boolean
          completed: boolean
          created_at: string
          id: string
          mission_date: string
          mission_id: string
          progress: number
          user_id: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          mission_date?: string
          mission_id: string
          progress?: number
          user_id: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          mission_date?: string
          mission_id?: string
          progress?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "daily_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_interests: {
        Row: {
          created_at: string
          creator_id: string | null
          hashtag_id: string | null
          id: string
          interest_score: number
          last_interaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          creator_id?: string | null
          hashtag_id?: string | null
          id?: string
          interest_score?: number
          last_interaction?: string
          user_id: string
        }
        Update: {
          created_at?: string
          creator_id?: string | null
          hashtag_id?: string | null
          id?: string
          interest_score?: number
          last_interaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interests_hashtag_id_fkey"
            columns: ["hashtag_id"]
            isOneToOne: false
            referencedRelation: "hashtags"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_weekly_missions: {
        Row: {
          claimed: boolean
          completed: boolean
          created_at: string
          id: string
          mission_id: string
          progress: number
          user_id: string
          week_start: string
        }
        Insert: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          mission_id: string
          progress?: number
          user_id: string
          week_start?: string
        }
        Update: {
          claimed?: boolean
          completed?: boolean
          created_at?: string
          id?: string
          mission_id?: string
          progress?: number
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_weekly_missions_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "weekly_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_xp: {
        Row: {
          created_at: string
          id: string
          last_streak_date: string | null
          level: number
          streak_days: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_streak_date?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_streak_date?: string | null
          level?: number
          streak_days?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      watch_parties: {
        Row: {
          created_at: string
          ended_at: string | null
          host_id: string
          id: string
          is_active: boolean
          platform: string
          stream_url: string
          streamer_channel: string | null
          title: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          host_id: string
          id?: string
          is_active?: boolean
          platform: string
          stream_url: string
          streamer_channel?: string | null
          title: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          host_id?: string
          id?: string
          is_active?: boolean
          platform?: string
          stream_url?: string
          streamer_channel?: string | null
          title?: string
        }
        Relationships: []
      }
      watch_party_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          party_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          party_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_comments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_members: {
        Row: {
          id: string
          joined_at: string
          party_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          party_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_members_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      watch_party_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          party_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          party_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          party_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_party_reactions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "watch_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_missions: {
        Row: {
          action_type: string
          coin_reward: number
          created_at: string
          description: string
          icon: string
          id: string
          is_active: boolean
          target_count: number
          title: string
          xp_reward: number
        }
        Insert: {
          action_type: string
          coin_reward?: number
          created_at?: string
          description: string
          icon?: string
          id?: string
          is_active?: boolean
          target_count?: number
          title: string
          xp_reward?: number
        }
        Update: {
          action_type?: string
          coin_reward?: number
          created_at?: string
          description?: string
          icon?: string
          id?: string
          is_active?: boolean
          target_count?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          bio: string | null
          country: string | null
          created_at: string | null
          discord_url: string | null
          full_name: string | null
          header_url: string | null
          id: string | null
          kick_url: string | null
          last_seen: string | null
          last_seen_visibility: string | null
          profile_visibility: string | null
          show_discord: boolean | null
          show_kick: boolean | null
          show_twitch: boolean | null
          show_youtube_gaming: boolean | null
          signup_number: number | null
          twitch_url: string | null
          updated_at: string | null
          username: string | null
          who_can_comment: string | null
          youtube_gaming_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          discord_url?: string | null
          full_name?: string | null
          header_url?: string | null
          id?: string | null
          kick_url?: string | null
          last_seen?: string | null
          last_seen_visibility?: string | null
          profile_visibility?: string | null
          show_discord?: boolean | null
          show_kick?: boolean | null
          show_twitch?: boolean | null
          show_youtube_gaming?: boolean | null
          signup_number?: number | null
          twitch_url?: string | null
          updated_at?: string | null
          username?: string | null
          who_can_comment?: string | null
          youtube_gaming_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          country?: string | null
          created_at?: string | null
          discord_url?: string | null
          full_name?: string | null
          header_url?: string | null
          id?: string | null
          kick_url?: string | null
          last_seen?: string | null
          last_seen_visibility?: string | null
          profile_visibility?: string | null
          show_discord?: boolean | null
          show_kick?: boolean | null
          show_twitch?: boolean | null
          show_youtube_gaming?: boolean | null
          signup_number?: number | null
          twitch_url?: string | null
          updated_at?: string | null
          username?: string | null
          who_can_comment?: string | null
          youtube_gaming_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_level: { Args: { xp: number }; Returns: number }
      delete_own_post: { Args: { _post_id: string }; Returns: boolean }
      get_my_email: { Args: never; Returns: string }
      get_post_viewers: {
        Args: { _post_id: string }
        Returns: {
          avatar_url: string
          full_name: string
          user_id: string
          username: string
          viewed_at: string
        }[]
      }
      get_profile_visibility: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_who_can_comment: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_hashtag_use_count: {
        Args: { _hashtag_id: string }
        Returns: undefined
      }
      is_seen_admin: { Args: never; Returns: boolean }
      is_verified_seller: { Args: { _user_id: string }; Returns: boolean }
      normalize_qr_handle: {
        Args: { _fallback_id?: string; _value: string }
        Returns: string
      }
      redeem_referral: { Args: { _code: string }; Returns: Json }
      verify_app_lock_pin: { Args: { _pin_hash: string }; Returns: boolean }
      xp_for_level: { Args: { lvl: number }; Returns: number }
    }
    Enums: {
      app_role: "fan" | "streamer" | "seller" | "admin"
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
      app_role: ["fan", "streamer", "seller", "admin"],
    },
  },
} as const
