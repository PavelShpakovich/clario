-- Add ui_language column to profiles table for i18n support
alter table public.profiles 
add column if not exists ui_language text default 'en' check (ui_language in ('en', 'ru'));

-- Add language column to themes table for card generation language
alter table public.themes
add column if not exists language text default 'en' check (language in ('en', 'ru'));

-- Create index for faster queries
create index if not exists idx_profiles_ui_language on public.profiles(ui_language);
create index if not exists idx_themes_language on public.themes(language);
