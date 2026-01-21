-- Allow authenticated users to read other users' wishlists (needed for matching)
-- Without this, the matching algorithm can't find cards from other users
CREATE POLICY "Authenticated users can view all wishlists for matching"
  ON wishlist FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read other users' collections (needed for matching)
-- Without this, the matching algorithm can't find cards from other users
CREATE POLICY "Authenticated users can view all collections for matching"
  ON collections FOR SELECT
  TO authenticated
  USING (true);

-- Allow authenticated users to read other users' locations (needed for matching)
-- Without this, the matching algorithm can't find nearby users
CREATE POLICY "Authenticated users can view all locations for matching"
  ON locations FOR SELECT
  TO authenticated
  USING (true);
