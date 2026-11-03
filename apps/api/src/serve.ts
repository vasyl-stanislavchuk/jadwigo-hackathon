// The api on this machine, with no AWS: `bun run dev` in apps/api. On PostgresStore when
// DATABASE_URL is set, else on an in-memory store seeded with nothing. It listens on 127.0.0.1 only,
// so `make api-dev ENV=dev` never serves jadwigo-dev data to the local network.
import { createServer } from "node:http";
import { MCP_PATH } from "@jadwigo/contracts";
import { InMemoryRunQueue } from "@jadwigo/jadwigo-ai";
import { createPostgresStore, InMemoryStore } from "@jadwigo/store";
import { createApp } from "./app.ts";
import { jwksUrlAuth } from "./auth.ts";
import {
  authIssuer,
  authJwksUrl,
  databaseUrl,
  localUploadsDir,
  mcpAuthorizationServer,
  mcpResourceUrl,
  port,
} from "./config.ts";
import { DEV_UPLOADS_PATH, devUploads, fsUploads, handleDevUpload } from "./dev-uploads.ts";
import { localPoke, type PokeStepHost } from "./poke.ts";

const url = databaseUrl();
// The token routes verify against AUTH_JWKS_URL (the dev project's JWKS) and AUTH_ISSUER; with
// either unset, they are all 401.
const authenticate = jwksUrlAuth(authJwksUrl(), authIssuer());
// On Postgres a message's step joins its unit on pgmq's agent_step; in memory it goes to a queue
// nobody reads: this server runs no step. With LOCAL_RUNNER_URL set (make dev-all), each committed
// step pokes the local step host, as the Lambda pokes the runner's alias (dl-uukj.47.14.1).
const queue = new InMemoryRunQueue(() => new Date());
// A LOCAL_RUNNER_URL in no form poke.ts takes is said once, and this server pokes nothing: the
// steps wait in the queue for the step host's own drain.
let poke: PokeStepHost | undefined;
try {
  poke = localPoke();
} catch (error) {
  process.stderr.write(
    `api: ${error instanceof Error ? error.message : String(error)}; no step host is poked\n`,
  );
}
// With LOCAL_UPLOADS_DIR set (make dev-all), a message's photos go to that folder, and this server
// answers the browser's form post and the thread's links at /__uploads, as S3 would (dl-z5ja.11.19).
const uploadsDir = localUploadsDir();
const dev =
  uploadsDir === undefined ? undefined : devUploads(uploadsDir, `http://127.0.0.1:${port()}`);
const app = createApp(url === undefined ? new InMemoryStore() : createPostgresStore(url), {
  authenticate,
  queue,
  poke,
  uploads: dev === undefined ? undefined : fsUploads(dev),
  // The router builds request URLs as https; this server is plain http on 127.0.0.1.
  mcp: {
    resourceUrl: mcpResourceUrl() ?? `http://127.0.0.1:${port()}${MCP_PATH}`,
    authorizationServer: mcpAuthorizationServer(),
  },
});
const context = {} as Parameters<typeof app.resolve>[1];

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const target = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";
  if (
    dev !== undefined &&
    (target.pathname === DEV_UPLOADS_PATH || target.pathname.startsWith(`${DEV_UPLOADS_PATH}/`))
  ) {
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v !== undefined) headers.set(k, Array.isArray(v) ? v.join(",") : v);
    const init: RequestInit = { method, headers };
    if (method !== "GET" && method !== "HEAD") init.body = new Uint8Array(Buffer.concat(chunks));
    // A fault here answers 500 and is said once; it never ends the server (#774 review).
    try {
      const out = await handleDevUpload(dev, new Request(target, init));
      res.writeHead(out.status, out.headers);
      res.end(out.body);
    } catch (error) {
      process.stderr.write(
        `api: ${DEV_UPLOADS_PATH} failed: ${error instanceof Error ? error.name : "error"}\n`,
      );
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("dev uploads failed");
    }
    return;
  }
  const reply = await app.resolve(
    {
      version: "2.0",
      routeKey: "$default",
      rawPath: target.pathname,
      rawQueryString: target.search.slice(1),
      headers: Object.fromEntries(
        Object.entries(req.headers).map(([k, v]) => [
          k,
          Array.isArray(v) ? v.join(",") : (v ?? ""),
        ]),
      ),
      requestContext: { http: { method, path: target.pathname }, stage: "$default" },
      body: chunks.length > 0 ? Buffer.concat(chunks).toString("utf8") : undefined,
      isBase64Encoded: false,
    },
    context,
  );
  const result = reply as { statusCode?: number; headers?: Record<string, string>; body?: string };
  res.writeHead(result.statusCode ?? 500, result.headers ?? {});
  res.end(result.body ?? "");
}).listen(port(), "127.0.0.1", () => process.stdout.write(`api on http://127.0.0.1:${port()}\n`));
