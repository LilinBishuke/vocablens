-- 招待コード使用回数インクリメント関数
CREATE OR REPLACE FUNCTION increment_invite_usage(invite_code_value TEXT)
RETURNS void AS $$
BEGIN
  UPDATE invite_codes
  SET used_count = used_count + 1
  WHERE code = invite_code_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
