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
          playstyle: string | null
          profile_visibility: string
          rank: string | null
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
          playstyle?: string | null
          profile_visibility?: string
          rank?: string | null
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
          playstyle?: string | null
          profile_visibility?: string
          rank?: string | null
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
          clipper_id: string
          created_at: string
          id: string
          platform: string
          reel_id: string | null
          source_streamer_id: string | null
          source_streamer_name: string | null
          stream_url: string
          title: string | null
        }
        Insert: {
          clipper_id: string
          created_at?: string
          id?: string
          platform: string
          reel_id?: string | null
          source_streamer_id?: string | null
          source_streamer_name?: string | null
          stream_url: string
          title?: string | null
        }
        Update: {
          clipper_id?: string
          created_at?: string
          id?: string
          platform?: string
          reel_id?: string | null
          source_streamer_id?: string | null
          source_streamer_name?: string | null
          stream_url?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_level: { Args: { xp: number }; Returns: number }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      xp_for_level: { Args: { lvl: number }; Returns: number }
    }
    Enums: {
      app_role: "fan" | "streamer" | "seller"
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
      app_role: ["fan", "streamer", "seller"],
    },
  },
} as const
