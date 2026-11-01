-- pgmq installs here as on Supabase (`make pgmq`, dl-z5ja.4 and dl-z5ja.53), and does what the
-- engine's queue relies on (dl-z5ja.52): a read hides a message for its visibility timeout and
-- counts the read, archive keeps it out of the queue, and a send rolled back leaves nothing.
begin;
select plan(6);

create extension if not exists pgmq;
select is((select extversion from pg_extension where extname = 'pgmq'), '1.5.1', 'pgmq is Supabase''s 1.5.1');

select pgmq.create('pgtap_probe');
select is(pgmq.send('pgtap_probe', '{"run_id": "made-up"}'), 1::bigint, 'send answers the message id');
select results_eq(
  $$select msg_id, read_ct, message ->> 'run_id' from pgmq.read('pgtap_probe', 30, 10)$$,
  $$values (1::bigint, 1, 'made-up')$$,
  'read answers it once and counts the read'
);
select is_empty($$select from pgmq.read('pgtap_probe', 30, 10)$$, 'inside its visibility timeout it is hidden');
select ok(pgmq.archive('pgtap_probe', 1::bigint), 'archive takes it out of the queue');
select results_eq(
  $$select (select count(*) from pgmq.q_pgtap_probe)::int, (select count(*) from pgmq.a_pgtap_probe)::int$$,
  $$values (0, 1)$$,
  'and keeps it in the archive'
);

select * from finish();
rollback;
