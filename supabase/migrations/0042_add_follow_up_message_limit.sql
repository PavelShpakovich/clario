-- Add message_limit column to follow_up_threads for credit-based chat unlock

alter table public.follow_up_threads
  add column message_limit integer not null default 5;

comment on column public.follow_up_threads.message_limit is
  'Maximum messages allowed in this thread. Increased by purchasing follow-up packs.';
