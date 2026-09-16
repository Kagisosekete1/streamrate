# StreamRate

StreamRate is a React and Supabase app for discovering, rating, and following streamers.

## Local development

Copy `.env.example` to `.env` if you need a separate local configuration, then install and run:

```sh
npm install
npm run dev
```

The production Supabase project is `oczrdiyvubwxttrrajhe`; the app's public address is [streamrateapp.com](https://streamrateapp.com).

## Supabase

Use the migrations in `supabase/migrations` for database changes. The final compatibility migration restores the role and admin helper functions needed by the app and its RLS policies.

Deploy only the Edge Functions you intend to operate. AI writing, StreamiiAi, and custom authentication email delivery are intentionally disabled until replacement providers are configured.

For Google login, configure `https://streamrateapp.com/home` as an allowed redirect URL in Supabase Auth and in your Google OAuth client.
