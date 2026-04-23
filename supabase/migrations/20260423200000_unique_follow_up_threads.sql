-- Deduplicate follow_up_threads: keep the thread with the most messages per (reading_id, user_id).
-- Then add a UNIQUE constraint so duplicates can never happen again.

-- Step 1: Delete duplicate threads, keeping the one with the most messages (or newest if tied).
DELETE FROM public.follow_up_threads t
WHERE t.id NOT IN (
  SELECT DISTINCT ON (ft.reading_id, ft.user_id) ft.id
  FROM public.follow_up_threads ft
  LEFT JOIN (
    SELECT thread_id, count(*) AS msg_count
    FROM public.follow_up_messages
    GROUP BY thread_id
  ) mc ON mc.thread_id = ft.id
  WHERE ft.reading_id IS NOT NULL
  ORDER BY ft.reading_id, ft.user_id, COALESCE(mc.msg_count, 0) DESC, ft.created_at DESC
)
AND t.reading_id IS NOT NULL;

-- Step 2: Add UNIQUE constraint
ALTER TABLE public.follow_up_threads
  ADD CONSTRAINT uq_follow_up_threads_reading_user UNIQUE (reading_id, user_id);
