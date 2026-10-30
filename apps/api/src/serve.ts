// The api on this machine, with no AWS: `bun run dev` in apps/api. On PostgresStore when
// DATABASE_URL is set, else on an in-memory store seeded with nothing. It listens on 127.0.0.1 only,
// so `make api-dev ENV=dev` never serves jadwigo-dev data to the local network.
import { createServer } from "node:http";
import { createPostgresStore, InMemoryStore } from "@jadwigo/store";
import { createApp } from "./app.ts";
import { jwksUrlAuth } from "./auth.ts";
import { authIssuer, authJwksUrl, databaseUrl, port } from "./config.ts";

const url = databaseUrl();
// The token routes verify against AUTH_JWKS_URL (the dev project's JWKS) and AUTH_ISSUER; with
// either unset, they are all 401.
const authenticate = jwksUrlAuth(authJwksUrl(), authIssuer());
const app = createApp(url === undefined ? new InMemoryStore() : createPostgresStore(url), {
  authenticate,
});
const context = {} as Parameters<typeof app.resolve>[1];

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const target = new URL(req.url ?? "/", "http://localhost");
  const method = req.method ?? "GET";
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
