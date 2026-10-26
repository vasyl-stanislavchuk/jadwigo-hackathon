# Runbooks

Steps a person runs by hand, usually the owner, because they are paid, careful or outward:
deploying, rolling back, rotating a secret, an AWS or Supabase console step.

One file per task: `docs/runbooks/<task>.md`.

- **Before:** what must be true first, each as a command that shows it.
- **Steps:** a numbered checklist, each step one command or one console action, with what you
  should see.
- **After:** the check that proves it worked.
- **Undo:** how to roll it back, or "one-way: cannot be undone" when it can't.

An agent writes and updates runbooks. The owner runs them. When a step can be a script, put the
script in `tools/` or `infra/` and make the step the command that runs it.

Runbooks land with the work that needs them: deploy (`dl-5ssh.2`), infra (`dl-5ssh.34.4`) and
migrations (`dl-5ssh.34.34`).
