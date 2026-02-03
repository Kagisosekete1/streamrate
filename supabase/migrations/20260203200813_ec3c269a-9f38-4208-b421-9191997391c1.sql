-- Add last_seen and last_seen_visibility columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_seen timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_seen_visibility text DEFAULT 'everyone';

-- Add blocked_users table for Report and Block functionality
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS on blocked_users
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies for blocked_users
CREATE POLICY "Users can view their own blocks" ON public.blocked_users
FOR SELECT USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block others" ON public.blocked_users
FOR INSERT WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock others" ON public.blocked_users
FOR DELETE USING (auth.uid() = blocker_id);

-- Add reports table for reporting users/content
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  reported_user_id UUID,
  reported_post_id UUID,
  reported_reel_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policies for reports
CREATE POLICY "Users can create reports" ON public.reports
FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view their own reports" ON public.reports
FOR SELECT USING (auth.uid() = reporter_id);