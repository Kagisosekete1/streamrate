-- Add header_url column to profiles for header photo uploads
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS header_url TEXT;