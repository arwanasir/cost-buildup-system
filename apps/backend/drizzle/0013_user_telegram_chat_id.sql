ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(64);
