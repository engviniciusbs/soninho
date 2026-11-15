-- New invite tokens are hex (URL-safe). Existing base64 tokens are untouched and keep working.
alter table public.family_invites
  alter column token set default encode(extensions.gen_random_bytes(24), 'hex');
