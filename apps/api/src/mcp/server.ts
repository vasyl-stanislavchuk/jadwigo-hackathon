// The remote MCP for parents (dl-1u6fn.8, epic dl-1u6fn): Streamable HTTP, stateless, JSON replies
// and never SSE, so one Lambda request is one MCP exchange. The Lambda verifies the parent's
// token itself (no gateway authorizer on this path), so a missing or bad one answers 401 with the
// WWW-Authenticate challenge MCP clients follow to the authorization server.
import { ErrorType, LIMITS, MCP_PATH } from "@jadwigo/contracts";
import { type Store, StoreError } from "@jadwigo/store";
import {
  type CallToolResult,
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  isLegacyRequest,
  localhostAllowedOrigins,
  McpServer,
  originValidationResponse,
  WebStandardStreamableHTTPServerTransport,
} from "@modelcontextprotocol/server";
import type { Authenticate, Claims } from "../auth.ts";
import { authorizeMember } from "../authorize.ts";
import { ApiError, errorResponse, json } from "../errors.ts";
import type { McpTool } from "./tool.ts";
import { TOOLS } from "./tools/index.ts";

/** RFC 9728's well-known path; the metadata is also served at it followed by `MCP_PATH`. */
export const PROTECTED_RESOURCE_PATH = "/.well-known/oauth-protected-resource";

/** The remote MCP's settings (src/config.ts). */
export interface McpConfig {
  /** The public URL of `MCP_PATH`; undefined takes the request's own origin. */
  readonly resourceUrl?: string | undefined;
  /** The OAuth authorization server's issuer the metadata names; undefined names none. */
  readonly authorizationServer?: string | undefined;
}

/** The URL clients know this MCP by. CloudFront hands the Lambda another host, hence the setting. */
function resourceOf(req: Request, config: McpConfig): URL {
  return new URL(config.resourceUrl ?? new URL(MCP_PATH, req.url).href);
}

/** `GET /.well-known/oauth-protected-resource[/api/mcp]`: who issues this resource's tokens. */
export function protectedResource(req: Request, config: McpConfig): Response {
  const as = config.authorizationServer;
  return json(200, {
    resource: resourceOf(req, config).href,
    authorization_servers: as === undefined ? [] : [as],
    bearer_methods_supported: ["header"],
    resource_name: "Jadwigo",
  });
}

/** What a 2026-07-28 request's server is built from, handed through the SDK's `authInfo.extra`. */
interface Caller {
  readonly store: Store | Promise<Store>;
  readonly claims: Claims;
}

/**
 * The 2026-07-28 handler, built once per Lambda environment, not per request: `createApp` runs per
 * request, and the SDK logs a warning each time one is built. Each request hands it its caller.
 */
const MODERN = createMcpHandler(
  ({ authInfo }) => {
    const caller = authInfo?.extra?.["caller"] as Caller;
    return serverFor(caller.store, caller.claims);
  },
  { legacy: "reject", responseMode: "json" },
);

/** `POST /api/mcp`: one JSON-RPC exchange as the token's parent; any other method is 405. */
export async function serveMcp(
  req: Request,
  event: unknown,
  store: Store | Promise<Store>,
  authenticate: Authenticate,
  config: McpConfig,
): Promise<Response> {
  const resource = resourceOf(req, config);
  // A browser's request from another site is refused (DNS rebinding); non-browser clients send none.
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(resource.hostname);
  const origins = [resource.hostname, ...(local ? localhostAllowedOrigins() : [])];
  const badOrigin = originValidationResponse(req, origins);
  if (badOrigin) return badOrigin;
  // The SDK compares the host only: an http page on the same host is another origin too.
  const origin = req.headers.get("origin");
  if (origin !== null && !local && URL.parse(origin)?.protocol !== resource.protocol)
    return rpcError(403, -32000, "Forbidden: the Origin's scheme is not the resource's");
  if (req.method !== "POST") {
    // Stateless: no SSE stream to GET and no session to DELETE.
    const reply = rpcError(405, -32000, "Method not allowed.");
    reply.headers.set("allow", "POST");
    return reply;
  }

  const claims = await authenticate(req, event);
  if (claims === undefined) {
    const reply = errorResponse(ErrorType.enum.NotSignedIn, "sign in to use this");
    const metadata = getOAuthProtectedResourceMetadataUrl(resource);
    // A token that was sent and failed is invalid_token (RFC 6750 3.1); none sent names no error.
    const sent = (req.headers.get("authorization") ?? "").trim() !== "";
    const error = sent ? 'error="invalid_token", ' : "";
    reply.headers.set("www-authenticate", `Bearer ${error}resource_metadata="${metadata}"`);
    return reply;
  }

  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > LIMITS.bodyBytes)
    return rpcError(413, -32600, `the body is over ${LIMITS.bodyBytes} bytes`);
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error: the body is not JSON");
  }
  // The 2025-06-18 spec dropped JSON-RPC batching, and the 2026-07-28 one has none either.
  if (Array.isArray(parsedBody))
    return rpcError(400, -32600, "Invalid Request: a batch is not supported, send one message");

  if (await isLegacyRequest(req, parsedBody)) {
    // 2025-era clients (initialize handshake): a fresh server and transport per request.
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    const legacy = serverFor(store, claims);
    await legacy.connect(transport);
    try {
      return await transport.handleRequest(req, { parsedBody });
    } finally {
      await legacy.close();
    }
  }
  // 2026-07-28 clients (a per-request envelope): stateless by design.
  const caller: Caller = { store, claims };
  const authInfo = { token: "", clientId: claims.client_id ?? "", scopes: [], extra: { caller } };
  return MODERN.fetch(req, { parsedBody, authInfo });
}

/** An MCP server with every tool in `TOOLS`, each call run as `claims`' pod member. */
function serverFor(store: Store | Promise<Store>, claims: Claims): McpServer {
  const server = new McpServer({ name: "jadwigo", version: "1.0.0" });
  for (const tool of TOOLS) {
    const config = { description: tool.description };
    if (tool.inputSchema === undefined)
      server.registerTool(tool.name, config, () => callTool(tool, undefined, store, claims));
    else
      server.registerTool(tool.name, { ...config, inputSchema: tool.inputSchema }, (input) =>
        callTool(tool, input, store, claims),
      );
  }
  return server;
}

/**
 * One tool call as one unit: the member lookup and the tool's reads, so row-level security scopes
 * them to the pod. A refusal reaches the caller as its message; anything else is logged, and the
 * caller reads only that the tool failed, never a database's words.
 */
async function callTool(
  tool: McpTool,
  input: unknown,
  store: Store | Promise<Store>,
  claims: Claims,
): Promise<CallToolResult> {
  // One line per call: the OAuth client (null for the web app's token), the tool and the outcome,
  // never its arguments or what it read (dl-1u6fn.17).
  const log = (outcome: "ok" | "refused" | "failed") =>
    process.stdout.write(
      `${JSON.stringify({ level: "INFO", message: "mcp tool call", client_id: claims.client_id, tool: tool.name, outcome })}\n`,
    );
  try {
    const opened = await store;
    const result = await opened.unit(async () =>
      tool.run(input, { store: opened, member: await authorizeMember(opened, claims), claims }),
    );
    log("ok");
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  } catch (error) {
    if (error instanceof ApiError || error instanceof StoreError) {
      log("refused");
      return { isError: true, content: [{ type: "text", text: error.message }] };
    }
    log("failed");
    const failure = error instanceof Error ? { name: error.name, message: error.message } : {};
    console.error(
      JSON.stringify({
        level: "ERROR",
        message: "mcp tool failed",
        tool: tool.name,
        error: failure,
      }),
    );
    return { isError: true, content: [{ type: "text", text: "the tool failed" }] };
  }
}

function rpcError(status: number, code: number, message: string): Response {
  return json(status, { jsonrpc: "2.0", error: { code, message }, id: null });
}
