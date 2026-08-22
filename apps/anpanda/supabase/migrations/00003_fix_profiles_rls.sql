-- Allow users to insert their own profile row
-- (required for magic link sign-in which bypasses /auth/callback)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
