-- Allow authenticated users to view basic info of other users (needed for matching)
-- Without this, the matching algorithm can't display display_name and avatar_url
-- of other users involved in matches.
--
-- Note: This policy allows viewing only via the API which already filters to
-- display_name and avatar_url fields. The policy itself allows full SELECT
-- access, but the application code controls what fields are exposed.

CREATE POLICY "Authenticated users can view basic user info for matching"
  ON public.users FOR SELECT
  TO authenticated
  USING (true);
