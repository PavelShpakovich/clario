-- Remove 'youtube' as a valid data source type.
-- YouTube transcript extraction was removed because very few videos have transcripts.
ALTER TABLE data_sources
  DROP CONSTRAINT IF EXISTS data_sources_type_check;

ALTER TABLE data_sources
  ADD CONSTRAINT data_sources_type_check
  CHECK (type IN ('text', 'pdf', 'docx', 'url'));
