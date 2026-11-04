-- Every featured lesson asks who is playing before it starts (issue dl-5ssh.156, decision page
-- jadwigo-hackathon/notes/2026-11-04-every-featured-lesson-asks-who-is-playing-before-it-starts):
-- a featured assignment's identity goes from none to type. A re-import of a lesson file updates
-- an assignment that is already there, so the API may change identity, on its own pod only (the
-- pod_scope policy), and no other column of an assignment.
grant update (identity) on assignment to jadwigo_api;
