-- Google and Facebook profile data is trimmed: a sign-in keeps the keys identity linking reads and
-- loses the name and the avatar, in the stored rows and in the token (migration
-- 20261030120000_trim_profile.sql, issue dl-e8ov.2.66, docs/research/profile-trim.md).
begin;
select plan(19);

-- Each write below is the one Supabase Auth makes on a sign-in, as its own role.
set local role supabase_auth_admin;

-- A first Google sign-in: the user, then the identity, with the claims Google's provider maps.
insert into auth.users (id, aud, role, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000a001', 'authenticated', 'authenticated', 'parent@example.com',
   '{"provider": "google", "providers": ["google"]}',
   '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
     "email": "parent@example.com", "email_verified": true, "phone_verified": false,
     "name": "Ada Parent", "full_name": "Ada Parent", "picture": "https://lh3.example/a.jpg",
     "avatar_url": "https://lh3.example/a.jpg"}');
insert into auth.identities (provider_id, user_id, identity_data, provider) values
  ('1001', '00000000-0000-4000-8000-00000000a001',
   '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
     "email": "Parent@Example.com", "email_verified": true, "phone_verified": false,
     "name": "Ada Parent", "full_name": "Ada Parent", "picture": "https://lh3.example/a.jpg",
     "avatar_url": "https://lh3.example/a.jpg"}', 'google');

reset role;

select is(
  (select raw_user_meta_data from auth.users where id = '00000000-0000-4000-8000-00000000a001'),
  '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
    "email": "parent@example.com", "email_verified": true, "phone_verified": false}'::jsonb,
  'a Google sign-up stores the linking keys of the user and no name or avatar'
);
select is(
  (select identity_data from auth.identities where provider = 'google'),
  '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
    "email": "Parent@Example.com", "email_verified": true, "phone_verified": false}'::jsonb,
  'a Google identity keeps its linking keys and no name or avatar'
);
select is(
  (select email from auth.identities where provider = 'google'), 'parent@example.com',
  'the identity''s email, which linking looks users up by, is still generated from identity_data'
);
select is(
  (select raw_app_meta_data from auth.users where id = '00000000-0000-4000-8000-00000000a001'),
  '{"provider": "google", "providers": ["google"]}'::jsonb,
  'app metadata is left alone'
);

-- The next Google sign-in: identity_data is overwritten, and the user's metadata merged with it.
set local role supabase_auth_admin;
update auth.identities set identity_data =
  '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
    "email": "parent@example.com", "email_verified": true, "phone_verified": false,
    "name": "Ada P.", "full_name": "Ada P.", "picture": "https://lh3.example/b.jpg",
    "avatar_url": "https://lh3.example/b.jpg", "custom_claims": {"hd": "example.com"}}',
  last_sign_in_at = now()
  where provider = 'google';
update auth.users set raw_user_meta_data = raw_user_meta_data ||
  '{"name": "Ada P.", "full_name": "Ada P.", "picture": "https://lh3.example/b.jpg",
    "avatar_url": "https://lh3.example/b.jpg", "custom_claims": {"hd": "example.com"}}'
  where id = '00000000-0000-4000-8000-00000000a001';
-- A write that leaves the metadata alone, as when Supabase Auth stamps the sign-in time.
update auth.users set last_sign_in_at = now() where id = '00000000-0000-4000-8000-00000000a001';

-- Facebook linked to the same parent by its verified email, which Facebook's claims leave out.
insert into auth.identities (provider_id, user_id, identity_data, provider) values
  ('2002', '00000000-0000-4000-8000-00000000a001',
   '{"iss": "https://graph.facebook.com/me", "sub": "2002", "provider_id": "2002",
     "email_verified": false, "phone_verified": false, "name": "Ada Parent", "full_name": "Ada Parent", "nickname": "ada", "slug": "ada",
     "picture": "https://fb.example/a.jpg", "avatar_url": "https://fb.example/a.jpg"}', 'facebook');
update auth.users set raw_user_meta_data = raw_user_meta_data ||
  '{"iss": "https://graph.facebook.com/me", "sub": "2002", "provider_id": "2002",
    "name": "Ada Parent", "nickname": "ada", "slug": "ada", "picture": "https://fb.example/a.jpg"}'
  where id = '00000000-0000-4000-8000-00000000a001';
reset role;

select is(
  (select identity_data from auth.identities where provider = 'google'),
  '{"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001", "provider_id": "1001",
    "email": "parent@example.com", "email_verified": true, "phone_verified": false}'::jsonb,
  'a later Google sign-in overwrites identity_data and still stores no name, avatar or custom claims'
);
select is(
  (select identity_data from auth.identities where provider = 'facebook'),
  '{"iss": "https://graph.facebook.com/me", "sub": "2002", "provider_id": "2002",
    "email_verified": false, "phone_verified": false}'::jsonb,
  'a linked Facebook identity keeps sub and loses name, nickname and avatar'
);
select is(
  (select raw_user_meta_data from auth.users where id = '00000000-0000-4000-8000-00000000a001'),
  '{"iss": "https://graph.facebook.com/me", "sub": "2002", "provider_id": "2002",
    "email": "parent@example.com", "email_verified": true, "phone_verified": false}'::jsonb,
  'the merged user metadata keeps email and sub and loses every profile key'
);
select ok(
  (select last_sign_in_at is not null from auth.users where id = '00000000-0000-4000-8000-00000000a001'),
  'a write that leaves the metadata alone goes through'
);

-- An email-code user's metadata is already only linking keys, and is stored as it came.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000a002', 'other@example.com',
   '{"sub": "00000000-0000-4000-8000-00000000a002", "email": "other@example.com",
     "email_verified": true, "phone_verified": false}');
select is(
  (select raw_user_meta_data from auth.users where id = '00000000-0000-4000-8000-00000000a002'),
  '{"sub": "00000000-0000-4000-8000-00000000a002", "email": "other@example.com",
    "email_verified": true, "phone_verified": false}'::jsonb,
  'an email-code user''s metadata is unchanged'
);
insert into auth.users (id, raw_user_meta_data) values ('00000000-0000-4000-8000-00000000a003', null);
select is(
  (select raw_user_meta_data from auth.users where id = '00000000-0000-4000-8000-00000000a003'),
  null, 'no metadata stays no metadata'
);

-- The custom access token hook: the token's user_metadata loses the profile, nothing else moves.
select is(
  app.custom_access_token(
    '{"user_id": "00000000-0000-4000-8000-00000000a001", "authentication_method": "oauth",
      "claims": {"aud": "authenticated", "exp": 1, "iat": 0, "iss": "https://x.supabase.co/auth/v1",
        "sub": "00000000-0000-4000-8000-00000000a001", "email": "parent@example.com", "phone": "",
        "role": "authenticated", "aal": "aal1", "session_id": "s", "is_anonymous": false,
        "app_metadata": {"provider": "google", "providers": ["google"]},
        "amr": [{"method": "oauth", "timestamp": 0}],
        "user_metadata": {"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001",
          "provider_id": "1001", "email": "parent@example.com", "email_verified": true,
          "phone_verified": false, "name": "Ada Parent", "full_name": "Ada Parent",
          "picture": "https://lh3.example/a.jpg", "avatar_url": "https://lh3.example/a.jpg"}}}'),
  '{"user_id": "00000000-0000-4000-8000-00000000a001", "authentication_method": "oauth",
    "claims": {"aud": "authenticated", "exp": 1, "iat": 0, "iss": "https://x.supabase.co/auth/v1",
      "sub": "00000000-0000-4000-8000-00000000a001", "email": "parent@example.com", "phone": "",
      "role": "authenticated", "aal": "aal1", "session_id": "s", "is_anonymous": false,
      "app_metadata": {"provider": "google", "providers": ["google"]},
      "amr": [{"method": "oauth", "timestamp": 0}],
      "user_metadata": {"iss": "https://www.googleapis.com/userinfo/v2/me", "sub": "1001",
        "provider_id": "1001", "email": "parent@example.com", "email_verified": true,
        "phone_verified": false}}}'::jsonb,
  'the hook trims user_metadata and keeps every other claim'
);
select is(
  app.custom_access_token('{"user_id": "u", "claims": {"sub": "u", "role": "anon"}}'),
  '{"user_id": "u", "claims": {"sub": "u", "role": "anon"}}'::jsonb,
  'a token with no user_metadata passes through unchanged'
);
select is(
  app.custom_access_token('{"user_id": "u", "claims": {"sub": "u", "user_metadata": {}}}'),
  '{"user_id": "u", "claims": {"sub": "u", "user_metadata": {}}}'::jsonb,
  'an empty user_metadata stays empty'
);

-- Only Supabase Auth runs the hook and the trim.
select ok(
  has_function_privilege('supabase_auth_admin', 'app.custom_access_token(jsonb)', 'execute')
    and has_schema_privilege('supabase_auth_admin', 'app', 'usage'),
  'supabase_auth_admin may run the hook'
);
select ok(
  has_function_privilege('supabase_auth_admin', 'app.profile_trimmed(jsonb)', 'execute'),
  'supabase_auth_admin may run the trim the hook calls'
);
select ok(
  not has_function_privilege('authenticated', 'app.custom_access_token(jsonb)', 'execute')
    and not has_function_privilege('anon', 'app.custom_access_token(jsonb)', 'execute'),
  'the Data API roles may not run the hook'
);
select ok(
  not has_function_privilege('jadwigo_api', 'app.custom_access_token(jsonb)', 'execute')
    and not has_function_privilege('jadwigo_api', 'app.profile_trimmed(jsonb)', 'execute'),
  'the API may not run the hook or the trim'
);
select ok(
  not has_function_privilege('authenticated', 'app.profile_trimmed(jsonb)', 'execute')
    and not has_function_privilege('anon', 'app.profile_trimmed(jsonb)', 'execute'),
  'the Data API roles may not run the trim'
);
select ok(
  not has_function_privilege('supabase_auth_admin', 'app.trim_profile()', 'execute'),
  'the trigger function is nobody''s to call: the triggers run it as its owner'
);

select * from finish();
rollback;
