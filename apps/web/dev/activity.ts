/**
 * The activity panel's dev-server side (dl-a38n.15, lane bridge; ask.ts calls it): tails the
 * transcript of the session `make builder` named in JADWIGO_DRAFTS_DIR/session.json, maps each
 * tool call to one plain line (tools/builder/activity.ts holds md's rules), and pushes the newest
 * lines as the `builder:activity` HMR event; `GET /@builder/activity` answers the same.
 * Only this machine is answered, through ask.ts's gate.
 */
import { readFileSync, statSync } from "node:fs";
import type { IncomingMessage } from "node:http";
import type { ViteDevServer } from "vite";
import { mapTranscript, readTail } from "../../../tools/builder/activity.ts";
import { type BuilderSession, sessionFile } from "../../../tools/builder/drafts.ts";

const ACTIVITY_PATH = "/@builder/activity";
const ACTIVITY_EVENT = "builder:activity";
// The panel shows this many lines; the transcript has them all.
const LINES_MAX = 20;
// How often the transcript's size is looked at: a call shows on the page within about a second.
const LOOK_MS = 1_000;

type Mark = "done" | "current" | "failed";

export type ActivityPayload = {
  session_id: string | null;
  steps: { at: string; text: string; mark: Mark }[];
};

/**
 * The session to follow: the one session.json names, unless this server was started inside
 * another builder session (JADWIGO_BUILDER_SESSION), whose activity is not this one's.
 */
export function followedSession(dir: string, envSession: string): BuilderSession | null {
  try {
    const record = JSON.parse(readFileSync(sessionFile(dir), "utf8")) as Partial<BuilderSession>;
    if (typeof record.session_id !== "string" || typeof record.transcript !== "string") return null;
    if (envSession && envSession !== record.session_id) return null;
    return record as BuilderSession;
  } catch {
    return null;
  }
}

/** The newest lines of what the session did, marked: failed, current (no result yet) or done. */
export function activityOf(session: BuilderSession | null): ActivityPayload {
  if (!session) return { session_id: null, steps: [] };
  const steps = mapTranscript(readTail(session.transcript), session.transcript).steps;
  return {
    session_id: session.session_id,
    steps: steps.slice(-LINES_MAX).map((step) => ({
      at: step.at,
      text: step.text,
      mark: step.failed ? "failed" : step.open ? "current" : "done",
    })),
  };
}

function stamp(path: string): string {
  try {
    const stat = statSync(path);
    return `${stat.size}:${stat.mtimeMs}`;
  } catch {
    return "";
  }
}

export function activity(
  server: ViteDevServer,
  dir: string,
  envSession: string,
  refuse: (req: IncomingMessage) => string,
): void {
  const read = () => activityOf(followedSession(dir, envSession));

  server.middlewares.use(ACTIVITY_PATH, (req, res) => {
    const refused = refuse(req);
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    if (refused) {
      res.statusCode = 403;
      res.end(JSON.stringify({ error: refused }));
      return;
    }
    res.end(JSON.stringify(read()));
  });

  let seen = "";
  let sent = "";
  const look = () => {
    const session = followedSession(dir, envSession);
    const now = `${stamp(sessionFile(dir))}|${session ? stamp(session.transcript) : ""}`;
    if (now === seen) return;
    seen = now;
    const payload = JSON.stringify(activityOf(session));
    if (payload === sent) return;
    sent = payload;
    server.ws.send({ type: "custom", event: ACTIVITY_EVENT, data: JSON.parse(payload) });
  };
  const timer = setInterval(look, LOOK_MS);
  timer.unref();
  server.httpServer?.on("close", () => clearInterval(timer));
}
