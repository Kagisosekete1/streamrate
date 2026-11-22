# Zyiro (StreamRate) Supabase tables and Android push notifications

This reference was prepared from the SQL migrations and app code in this repository. The migration history contains `CREATE TABLE` statements for the 66 application tables below; that does not prove every migration has been applied to the live Supabase project. Run the inventory SQL near the end to see what exists in project `oczrdiyvubwxttrrajhe` right now.

Supabase-managed `auth.users` stores sign-in identities. Storage uses `storage.buckets` and `storage.objects` for uploaded media. Those are managed separately from the 66 application tables listed here.

## Application tables

### Accounts, profiles, and safety

- `profiles` — Public app profile for an Auth user: display name, username, avatar, bio, and profile settings. Referenced to render posts, reels, and notifications. Profile edits do not themselves create a push.
- `user_roles` — User role assignments, such as streamer/admin roles. Used by role checks and access rules; no push by itself.
- `connected_platforms` — External streaming/social account links. Used to associate platform accounts with a profile; no push by itself.
- `profile_qr_aliases` — Old and alternate QR/profile identifiers that resolve to a profile. No push.
- `profile_views` — Profile visit history. The current notification migration intentionally removes its notification trigger; visiting a profile should not push an alert.
- `blocked_users` — Who a user blocks. Used for privacy and interaction filtering; no push.
- `reports` — User-submitted abuse/content reports. Used for moderation review; no automatic user push in the notification path described here.
- `security_findings` — Security/admin review records. Not a social notification source.
- `app_lock_settings` — Per-user app PIN-lock settings. No push.
- `app_versions` — App version/release metadata used by update prompts or compatibility checks. No social push.

### Posts and social interactions

- `posts` — Text/image post records, owner, timestamps, and counters. A new row does not automatically notify everyone; the specific interaction triggers below create notifications for likes, comments, shares, and views.
- `post_likes` — One user’s like on a post. Inserting a like creates a `notifications` row for the post owner (not for self-likes), then the notification trigger requests a push.
- `comments` — Post comments and replies, including `parent_id`. A new comment can notify the post owner; a reply can notify the parent-comment author; `@username` mentions can notify mentioned users.
- `comment_likes` — Likes on a post comment. Creates a notification for the comment author (not self-likes).
- `post_shares` — Share events. Creates a notification for the original post owner (not self-shares).
- `follows` — Follower/following relationships. A new follow creates a `new_follower` notification for the followed profile (not a self-follow).
- `post_views` — View records for posts. The current migration creates a notification for the post owner on a view record (except self-views). Check live constraints and volume before enabling high-volume view alerts.
- `bookmarks` — Posts saved by a user. Private collection behavior; no push.
- `draft_posts` — A user’s unpublished post drafts. No push.
- `poll_votes` — Votes submitted to stream polls. Creates a notification for the poll’s streamer (not self-votes).
- `hashtags` — Hashtag directory and usage counts. No push by itself.
- `hashtag_daily_usage` — Per-day hashtag usage/analytics. No push.

### Reels and clips

- `reels` — Short-video records, creator, caption, media URL, and counters. Uploading a reel is not a follower push in the current trigger set.
- `reel_likes` — Likes on reels. Creates a notification for the reel owner (not self-likes).
- `reel_comments` — Reel comments and replies. Creates a notification for the reel owner; `@username` mentions also notify the mentioned profile.
- `reel_shares` — Reel share events. Stores sharing activity; the current notification migration does not attach a dedicated share trigger to this table.
- `reel_views` — Reel view records. Creates at most one view notification per viewer/reel per 24 hours in the current migration.
- `reel_hashtags` — Joins reels to hashtags for discovery. No push.
- `stream_clips` — Stream highlight/clip metadata. No push by itself.

### Notifications, reminders, and delivery logs

- `notifications` — The in-app notification inbox, read state, actor, and links to relevant posts/reels/comments/polls. Realtime updates refresh the app’s inbox and badge. An insert normally invokes the push trigger, except `profile_view`.
- `notification_settings` — Per-user notification preferences. The app currently stores stream-reminder, raid, co-stream-request, and tournament-event toggles. **Current backend behavior only checks `stream_reminders_enabled` in the reminder dispatcher; social-trigger pushes do not yet check these toggles.** These are not a global mute switch.
- `push_dispatch_logs` — Result/status, request payload, OneSignal response, and errors for each push attempt. Use it to diagnose delivery failures; it does not generate user pushes.
- `stream_schedules` — Scheduled streams. No push by itself.
- `stream_schedule_reminders` — Reminder recipients, lead time, retry state, and sent time for a scheduled stream. `dispatch-stream-reminders` checks the recipient’s stream reminder preference, inserts a `notifications` row, and records a dispatch result.
- `reminder_dispatch_logs` — Counts/errors for scheduled reminder runs. Admin diagnostics only.
- `profile_boosts` — Purchased/active profile boosts. An active boost creates a confirmation notification for the buyer.

### Streaming and community features

- `stream_polls` — Poll question/options owned by a streamer. Votes are stored in `poll_votes`; a vote can notify the streamer.
- `stream_raids` — Raid invitations/activity between streamers. The app can create notifications for raid events; the push is sent when the notification row is inserted.
- `co_stream_requests` — Requests to co-stream. App-generated notification rows can alert the other streamer; the request row alone is not a push unless code inserts a corresponding notification.
- `chat_commands` — Streamer-configured chat bot commands. No push.
- `watch_parties` — Watch-party rooms and metadata. A room change alone is not a push; participant/comment/reaction flows can create notifications where app logic does so.
- `watch_party_members` — Users in a watch party. Membership data; no universal push from the table itself.
- `watch_party_comments` — Watch-party chat/comments. No push trigger in the current interaction migration.
- `watch_party_reactions` — Reactions in a watch party. No push trigger in the current interaction migration.
- `squad_requests` — Looking-for-group/team-up requests. App notification code may alert recipients; no generic table trigger in the current push migration.
- `streaming_analytics` — Streaming performance/analytics data. No push.
- `streamer_games` — Games associated with a streamer profile. No push.
- `streamer_gear` — Equipment listed by a streamer. No push.
- `ratings` — User ratings/reviews of streamers. No push unless app logic separately inserts a notification.
- `tournaments` — Tournament definitions and host data. No push from the table alone.
- `tournament_teams` — Teams/participants in tournaments. No push from the table alone.
- `tournament_matches` — Match schedule, scores, winner, confirmation, and lock state. No push from the table alone.
- `tournament_match_audit` — Audit history for match result changes. No user push.

### Store, referrals, and progression

- `store_products` — Items available in the in-app store. No push.
- `seller_verifications` — Seller identity/eligibility review records. No push.
- `seller_subscriptions` — Seller subscription/plan records. No push unless billing code explicitly writes a notification.
- `referrals` — Referral relationships and reward attribution. Some app flows may insert a referral notification; the row itself is not a general push trigger.
- `user_coins` — Current coin balance per user. No push by itself.
- `coin_transactions` — Coin earn/spend ledger. No push by itself.
- `user_xp` — User experience points and level progression. No push by itself.
- `user_badges` — Badges earned by users. No push by itself.
- `weekly_missions` — Definitions for weekly missions. No push by itself.
- `daily_missions` — Definitions for daily missions. No push by itself.
- `user_weekly_missions` — A user’s weekly mission progress/completion. No push unless a separate app flow creates a notification.
- `user_daily_missions` — A user’s daily mission progress/completion. No push unless a separate app flow creates a notification.
- `user_interests` — Personalization signals used to rank feeds/reels. No push.

## Which events currently create notification rows?

In the current notification migration, the database creates inbox rows for: post likes, post comments/replies, mentions in post/reel comments, comment likes, new followers, post shares, reel likes, reel comments, post views, reel views (daily deduplicated), active profile boosts, and poll votes. Other notification producers in Edge Functions include go-live alerts, scheduled stream reminders, and inactive-creator nudges. App code also writes some feature notifications directly.

The important distinction: likes/comments/etc. are saved in their feature tables first. A database trigger creates a row in `notifications`. Then `on_notification_send_push` calls the Supabase `send-push-notification` Edge Function. The function targets the recipient’s OneSignal `external_id`, which this app sets to the Supabase Auth user ID. OneSignal sends to the Android push subscription through Firebase Cloud Messaging (FCM). The inbox/realtime path works only while the app is running; OneSignal + FCM is what can display a system notification when Zyiro is backgrounded or closed.

## Configure closed-app Android notifications

Do these steps for the existing OneSignal app ID configured in Zyiro (`447ab0ac-d32a-4aa8-bb29-d4b50c562672`). Never put the OneSignal REST API key or Firebase service-account private key in the app, chat, or GitHub.

1. **Confirm Firebase Android configuration.** The Android package must match the Firebase Android app registration, and `google-services.json` must come from the same Firebase project whose service-account key is uploaded to OneSignal. OneSignal’s current Android setup requires an FCM service-account private key on the OneSignal side and recommends `google-services.json` in the Android app. See [OneSignal Android Firebase credentials](https://documentation.onesignal.com/docs/en/android-firebase-credentials).
2. **Upload FCM credentials in OneSignal.** In OneSignal open **Settings → Push & In-App → Google Android (FCM)**, upload the Firebase service-account private-key JSON, and save. Confirm the FCM platform status becomes active. The Firebase Cloud Messaging API v1 must be enabled for that Firebase project.
3. **Set the server REST key in Supabase.** In Supabase project `oczrdiyvubwxttrrajhe`, open **Edge Functions → Secrets** and set `ONESIGNAL_REST_API_KEY` to the REST API key from the same OneSignal app. Keep it server-side. Supabase Edge Functions read project secrets from this page. See [Supabase Edge Function secrets](https://supabase.com/docs/guides/functions/secrets).
4. **Deploy the function and migrations.** Ensure `send-push-notification` is deployed and the notification-trigger migration is applied to this project. The repo’s trigger calls the function through `pg_net`. Check Database → Extensions for `pg_net` if the call never starts. Supabase documents database-to-function calls using `pg_net` here: [Supabase pg_net](https://supabase.com/docs/guides/database/extensions/pg_net).
5. **Enable permission on the A05.** Open Zyiro → Settings → Notifications → **Allow notifications**. If Android already denied it, open Android **Settings → Apps → Zyiro → Notifications → Allow notifications**. Android 13 and later require runtime permission. Also turn off battery restriction for Zyiro if the phone delays background delivery.
6. **Check the OneSignal user link.** Sign into Zyiro on the A05 while online. The app calls `OneSignal.login(<Supabase Auth user UUID>)`; the OneSignal subscription must show the same `external_id` in the OneSignal audience. Each recipient must have opened the app at least once and granted notification permission.
7. **Send a OneSignal test push.** In OneSignal target the A05 subscription and send a test message while Zyiro is closed. This tests FCM → Android independently from the database.
8. **Test the full app path.** With a second account, create a real like/comment/follow event. Confirm a row appears under Supabase **Table Editor → notifications**, then inspect **push_dispatch_logs** for `sent` or its error details. Finally tap the Android notification and confirm its deep link opens the expected post, reel, or profile.

### Current gaps to fix before relying on all alert preferences

- The migration’s `notify_push()` call currently sends no auth header, and `send-push-notification` has `verify_jwt = false`. That makes the function callable without a Supabase JWT. Before production, lock it down with a server-only shared secret kept in Supabase Vault/Secrets and validated by the function. Do not expose that secret to app code. Supabase describes secure `pg_net` function calls and secrets in its [Database Webhooks](https://supabase.com/docs/guides/database/webhooks) and [Edge Function secrets](https://supabase.com/docs/guides/functions/secrets) guides.
- The four notification toggles are not consistently enforced. `stream_reminders_enabled` is checked by the reminder dispatcher; social trigger pushes currently send regardless of the other stored preference values. To have per-user mute controls really work while the app is closed, the backend must check the recipient’s settings before calling OneSignal.
- Current trigger logic sends a push for every inserted `post_views` row and at most once per viewer/reel per day for `reel_views`. High view volume can create noisy pushes; consider keeping view events in-app only or batching them.
- Android’s small status-bar icon is not a full-color logo. Android requires a monochrome transparent silhouette; OneSignal’s default bell is shown if a valid small icon resource is missing. The larger notification image/avatar is a separate field. See [OneSignal notification icon rules](https://documentation.onesignal.com/docs/en/notification-icons).

## Check the actual live table list

Run this read-only query in Supabase SQL Editor to show public base tables currently present in the project:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

The app’s SQL migration history is not a live-schema export. If a table appears in this document but not in that query, its migration has not created it in the selected project (or it was removed/renamed later).
