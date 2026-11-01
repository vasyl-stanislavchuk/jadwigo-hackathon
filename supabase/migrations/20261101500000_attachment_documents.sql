-- A parent may attach a HEIC the page cannot decode, a PDF or a DOCX, uploaded as it is (homework
-- epic dl-z5ja.11, wave 6 step 0 dl-z5ja.11.11; decisions 58 to 61,
-- docs/worklog/dl-z5ja/2026-11-01-wave-6.md). The converter renders it to page JPEGs when a turn
-- reads it; this table only learns the new kinds, the file's name, and that a document has no
-- width or height. Columns stay @jadwigo/contracts/run's Attachment, checked by naming.test.ts.
-- A DOCX's media type is 71 bytes and an enum label holds 63, so the column becomes text, held to
-- the 4 kinds by a check; the wire's AttachmentMediaType stays the enum the API parses with.
alter table attachment alter column media_type type text using media_type::text;
drop type attachment_media_type;
alter table attachment add constraint attachment_media_type check (media_type in (
  'image/jpeg',
  'image/heic',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
));

-- The file's name, for the parent's chip; never sent to the model.
alter table attachment
  add column name text check (name <> '' and char_length(name) <= 120);

alter table attachment alter column width drop not null;
alter table attachment alter column height drop not null;

-- A JPEG is the page's re-encode and always has its size; another kind has none.
alter table attachment add constraint attachment_size_by_kind check (
  (media_type = 'image/jpeg') = (width is not null and height is not null)
);
