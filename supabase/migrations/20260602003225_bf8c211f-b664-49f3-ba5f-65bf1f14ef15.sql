CREATE POLICY "Users can read their own post views"
ON public.post_views
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);