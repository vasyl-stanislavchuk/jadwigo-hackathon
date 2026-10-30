/**
 * The render check's dev-server side (dl-a38n.28, lane web): `POST /@builder/render` takes the
 * findings the page's render rules (src/playground/lesson/render/rules.ts) gave a draft, behind
 * ask.ts's loopback gate, and writes them to `<draft_id>.render.json` beside the draft. The draft
 * watcher sends the file with the draft, so the findings pin like the check's, and jw's
 * `lesson_check` reads it too (dl-a38n.29), so the agent sees them without the page.
 *
 *   <draft_id>.render.json   {draft_id, findings: Finding[], rendered_at}
 *
 * It is written as a dot file and renamed into place, as jw writes its own, so the watcher reads it
 * whole.
 */

import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { join } from "node:path";
import type { Finding } from "@jadwigo/lesson-import/file";
import type { ViteDevServer } from "vite";
import { isDraftId } from "../../../tools/builder/drafts.ts";
import { findingsOf } from "../src/playground/lesson/table/findings.ts";
import { admit } from "./ask.ts";

export const RENDER = ".render.json";
const RENDER_PATH = "/@builder/render";
const BODY_MAX = 256 * 1024;

const renderFile = (dir: string, id: string): string => join(dir, `${id}${RENDER}`);

/** A draft's render file as written, or null when there is none or it does not parse. */
export function readRender(dir: string, id: string): unknown {
  const path = renderFile(dir, id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return null;
  }
}

/** The page's post, or why it was refused. Findings that are not findings are left out. */
export function parseRender(
  body: string,
): { draft_id: string; findings: Finding[] } | { error: string } {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    return { error: "the body is not JSON" };
  }
  const { draft_id, findings } = (value ?? {}) as { draft_id?: unknown; findings?: unknown };
  if (typeof draft_id !== "string" || !isDraftId(draft_id))
    return { error: "draft_id is not a draft id" };
  if (!Array.isArray(findings)) return { error: "findings is not a list" };
  return { draft_id, findings: findingsOf({ findings }) };
}

/** Writes the render file for `draft_id`, whole: a dot file renamed into place. */
export function writeRender(dir: string, draft_id: string, findings: Finding[], at: Date): void {
  const part = join(dir, `.${draft_id}${RENDER}.part`);
  writeFileSync(
    part,
    `${JSON.stringify({ draft_id, findings, rendered_at: at.toISOString() }, null, 2)}\n`,
  );
  renameSync(part, renderFile(dir, draft_id));
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string | null> {
  return new Promise((done) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size <= BODY_MAX) chunks.push(chunk);
    });
    req.on("end", () => done(size > BODY_MAX ? null : Buffer.concat(chunks).toString("utf8")));
    req.on("error", () => done(null));
  });
}

/** Adds `POST /@builder/render` to the dev server. The draft must exist in `dir`. */
export function render(server: ViteDevServer, dir: string): void {
  server.middlewares.use(RENDER_PATH, async (req, res) => {
    if (req.method !== "POST") return sendJson(res, 405, { error: "POST render findings here" });
    const refused = admit({
      method: req.method,
      remoteAddress: req.socket.remoteAddress,
      headers: req.headers,
    });
    if (refused) return sendJson(res, refused.status, { error: refused.error });
    const body = await readBody(req);
    if (body === null) return sendJson(res, 413, { error: "render findings are at most 256 KB" });
    const parsed = parseRender(body);
    if ("error" in parsed) return sendJson(res, 400, parsed);
    if (!existsSync(join(dir, `${parsed.draft_id}.json`)))
      return sendJson(res, 404, { error: `no draft ${parsed.draft_id}` });
    writeRender(dir, parsed.draft_id, parsed.findings, new Date());
    sendJson(res, 200, { written: parsed.findings.length });
  });
}
