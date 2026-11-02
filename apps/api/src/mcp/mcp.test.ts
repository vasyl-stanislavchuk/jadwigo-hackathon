import { randomUUID } from "node:crypto";
import { MCP_PATH, type Me, ROUTES } from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { bearerOf, signToken, testAuth } from "../testing/token.ts";

const RESOURCE = "https://app.jadwigo.test/api/mcp";
const ISSUER = "https://auth.jadwigo.test/auth/v1";
const MCP_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

interface Reply {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

describe("the remote MCP, /api/mcp", () => {
  let call: (method: string, path: string, body?: unknown, headers?: object) => Promise<Reply>;

  beforeEach(() => {
    const app = createApp(new InMemoryStore(), {
      authenticate: testAuth,
      mcp: { resourceUrl: RESOURCE, authorizationServer: ISSUER },
    });
    const context = {} as Parameters<typeof app.resolve>[1];
    call = async (method, path, body, headers = {}) => {
      const reply = (await app.resolve(
        {
          version: "2.0",
          routeKey: "$default",
          rawPath: path,
          rawQueryString: "",
          headers: { ...MCP_HEADERS, ...headers },
          requestContext: { http: { method, path }, stage: "$default" },
          body: body === undefined ? undefined : JSON.stringify(body),
          isBase64Encoded: false,
        },
        context,
      )) as { statusCode: number; headers?: Record<string, string>; body?: string };
      return {
        status: reply.statusCode,
        headers: Object.fromEntries(
          Object.entries(reply.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]),
        ),
        body: reply.body ? JSON.parse(reply.body) : null,
      };
    };
  });

  /** A parent with an account and the children named, and their MCP JSON-RPC caller. */
  async function parent(children: string[]) {
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    expect(
      (await call("POST", ROUTES.createAccount.path, { language: "pl" }, headers)).status,
    ).toBe(201);
    for (const first_name of children)
      expect(
        (await call("POST", ROUTES.createLearner.path, { first_name, goals: [] }, headers)).status,
      ).toBe(201);
    let id = 0;
    return (method: string, params: object = {}) =>
      call("POST", MCP_PATH, { jsonrpc: "2.0", id: ++id, method, params }, headers);
  }

  const INITIALIZE = {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "test", version: "0" },
  };

  it("answers no token, or a bad one, 401 with the resource_metadata challenge", async () => {
    for (const headers of [{}, bearerOf(signToken({}, true))]) {
      const reply = await call(
        "POST",
        MCP_PATH,
        { jsonrpc: "2.0", id: 1, method: "initialize", params: INITIALIZE },
        headers,
      );
      expect(reply.status).toBe(401);
      expect(reply.headers["www-authenticate"]).toBe(
        'Bearer resource_metadata="https://app.jadwigo.test/.well-known/oauth-protected-resource/api/mcp"',
      );
    }
  });

  it("serves the protected-resource metadata naming the authorization server", async () => {
    for (const path of [
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/api/mcp",
    ]) {
      const reply = await call("GET", path);
      expect(reply.status).toBe(200);
      expect(reply.body).toEqual({
        resource: RESOURCE,
        authorization_servers: [ISSUER],
        bearer_methods_supported: ["header"],
        resource_name: "Jadwigo",
      });
    }
  });

  it("refuses another site's Origin, and a GET or DELETE (no SSE, no session)", async () => {
    const rpc = await parent([]);
    expect((await call("POST", MCP_PATH, {}, { origin: "https://evil.test" })).status).toBe(403);
    expect((await call("GET", MCP_PATH)).status).toBe(405);
    expect((await call("DELETE", MCP_PATH)).status).toBe(405);
    expect((await rpc("initialize", INITIALIZE)).status).toBe(200);
  });

  it("initializes, lists the tools, and me returns the token's own pod's learners only", async () => {
    await parent(["Other"]);
    const rpc = await parent(["Ala", "Olek"]);

    const init = await rpc("initialize", INITIALIZE);
    expect(init.status).toBe(200);
    expect(init.headers["content-type"]).toMatch(/^application\/json/);
    expect(init.headers["mcp-session-id"]).toBeUndefined();
    expect(init.body).toMatchObject({ result: { serverInfo: { name: "jadwigo" } } });

    const list = await rpc("tools/list");
    expect(list.body).toMatchObject({ result: { tools: [{ name: "me" }] } });

    const me = (await rpc("tools/call", { name: "me", arguments: {} })).body as {
      result: { isError?: boolean; content: { text: string }[] };
    };
    expect(me.result.isError).toBeFalsy();
    const body = JSON.parse(me.result.content[0]?.text ?? "null") as Me;
    expect(body.learners.map((l) => l.learner.first_name).sort()).toEqual(["Ala", "Olek"]);
  });

  it("answers a signed-in user with no account as a tool error, not a crash", async () => {
    const headers = bearerOf(signToken({ sub: randomUUID() }));
    const reply = await call(
      "POST",
      MCP_PATH,
      { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "me", arguments: {} } },
      headers,
    );
    expect(reply.body).toMatchObject({ result: { isError: true } });
  });
});
