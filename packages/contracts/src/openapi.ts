import { z } from "zod";
import { components } from "./registry.ts";
import { ROUTE_TAGS, type Route } from "./routes.ts";
import { ERROR_STATUS } from "./wire.ts";

/**
 * The OpenAPI 3.1 document of the route table, snapshotted at `openapi.json` (dl-5ssh.90.5). The
 * docs app reads that file and adds the `servers`, which this package cannot know: it imports no
 * config.
 */
type Json = { [key: string]: unknown };

const SCHEMAS = "#/components/schemas/";
const ERROR = "#/components/responses/Error";

/** A route's `auth` as security: the Supabase token, or the bank's shared read token. */
const SECURITY_SCHEMES = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description:
      "A Supabase Auth access token for a signed-in adult. API Gateway's JWT authorizer verifies it.",
  },
  bankToken: {
    type: "http",
    scheme: "bearer",
    description:
      "The question bank's shared read token, not a Supabase token. The API checks it itself.",
  },
} as const;

/**
 * `questionSearches` is `auth: "none"` at the gateway, yet the bank route takes its own token
 * (`routes.ts`), so its security comes from the tag.
 */
function security(route: Route): (keyof typeof SECURITY_SCHEMES)[] {
  if (route.auth === "token") return ["bearerAuth"];
  return route.tag === "bank" ? ["bankToken"] : [];
}

/** Each component without the `$schema` and `$id` that `z.toJSONSchema` writes on a root. */
function generate(
  registry: z.core.$ZodRegistry<{ id: string }>,
  io: "input" | "output",
  uri: (id: string) => string,
): Record<string, Json> {
  const { schemas } = z.toJSONSchema(registry, { io, uri }) as { schemas: Record<string, Json> };
  return Object.fromEntries(
    Object.entries(schemas).map(([id, { $schema: _, $id: __, ...schema }]) => [id, schema]),
  );
}

/**
 * Bodies are read as `io: "input"`, replies written as `io: "output"`. Where a schema differs
 * between the two (a non-strict object accepts more keys, a default makes a key optional), its
 * input copy is `<Name>Input`, and so is every input schema that refers to one.
 */
function schemaSets(registry: z.core.$ZodRegistry<{ id: string }>) {
  const output = generate(registry, "output", (id) => SCHEMAS + id);
  const differs = new Set<string>();
  for (;;) {
    const input = generate(registry, "input", (id) =>
      differs.has(id) ? `${SCHEMAS + id}Input` : SCHEMAS + id,
    );
    const more = Object.keys(input).filter(
      (id) => !differs.has(id) && JSON.stringify(input[id]) !== JSON.stringify(output[id]),
    );
    if (more.length === 0) {
      const all: Record<string, Json> = { ...output };
      for (const id of differs) {
        if (`${id}Input` in all) throw new Error(`${id}Input is already a schema's name`);
        all[`${id}Input`] = input[id] as Json;
      }
      return { all, differs };
    }
    for (const id of more) differs.add(id);
  }
}

/** Only the components a path reaches, in name order. */
function reached(roots: unknown, all: Record<string, Json>): Record<string, Json> {
  const found = new Set<string>();
  const walk = (v: unknown): void => {
    if (v === null || typeof v !== "object") return;
    for (const [key, value] of Object.entries(v)) {
      if (key === "$ref" && typeof value === "string" && value.startsWith(SCHEMAS)) {
        const id = value.slice(SCHEMAS.length);
        if (!found.has(id)) {
          found.add(id);
          walk(all[id]);
        }
      } else walk(value);
    }
  };
  walk(roots);
  return Object.fromEntries([...found].sort().map((id) => [id, all[id] as Json]));
}

/** Which error types answer with which status, for the one Error response. */
function errorTable(): string {
  const byStatus = new Map<number, string[]>();
  for (const [type, status] of Object.entries(ERROR_STATUS)) {
    byStatus.set(status, [...(byStatus.get(status) ?? []), `\`${type}\``]);
  }
  return [...byStatus]
    .sort(([a], [b]) => a - b)
    .map(([status, types]) => `- ${status}: ${types.join(", ")}`)
    .join("\n");
}

/** A route table the document cannot describe. The message starts with the route key. */
export class RouteTableError extends Error {
  override name = "RouteTableError";
}

export function openApiDocument(routes: Record<string, Route>): Json {
  const { registry, names } = components();
  const { all, differs } = schemaSets(registry);
  const nameOf = (schema: z.ZodType, what: string): string => {
    const name = names.get(schema);
    if (name === undefined) throw new RouteTableError(`${what} is not an exported schema`);
    return name;
  };

  const paths: Record<string, Record<string, Json>> = {};
  for (const [operationId, route] of Object.entries(routes)) {
    if (!(route.params instanceof z.ZodObject)) {
      throw new RouteTableError(`${operationId}: params is not a z.object()`);
    }
    const shape = route.params.shape as Record<string, z.ZodType>;
    for (const [, name] of route.path.matchAll(/\{([^}]+)\}/g)) {
      if (name !== undefined && !Object.hasOwn(shape, name)) {
        throw new RouteTableError(`${operationId}: {${name}} in path but not in params`);
      }
    }
    // A path segment is always a string, so the input side of a coercion (`Seq`) says nothing:
    // the parameter shows what the parser accepts.
    const parameters = Object.entries(shape).map(([name, schema]) => {
      if (!route.path.includes(`{${name}}`))
        throw new RouteTableError(`${operationId}: no {${name}} in path`);
      const id = names.get(schema);
      const { $schema: _, ...inlined } = z.toJSONSchema(schema, { io: "output" });
      return {
        name,
        in: "path",
        required: true,
        schema: id === undefined ? inlined : { $ref: SCHEMAS + id },
      };
    });
    // A query parameter is optional unless its schema refuses a missing value.
    const query = Object.entries((route.query?.shape ?? {}) as Record<string, z.ZodType>).map(
      ([name, schema]) => {
        const { $schema: _, ...inlined } = z.toJSONSchema(schema, { io: "output" });
        return {
          name,
          in: "query",
          required: !schema.safeParse(undefined).success,
          schema: inlined,
        };
      },
    );
    parameters.push(...query);
    const schemes = security(route);
    let body: Json | undefined;
    if (route.body !== null) {
      const name = nameOf(route.body, `${operationId}'s body`);
      body = {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: SCHEMAS + (differs.has(name) ? `${name}Input` : name) },
          },
        },
      };
    }
    const response = nameOf(route.response, `${operationId}'s response`);
    const operation: Json = {
      operationId,
      summary: route.summary,
      ...(route.description === undefined ? {} : { description: route.description }),
      tags: [route.tag],
      // `[]` says the route is open, rather than leaving it to a document-wide default.
      security: schemes.map((scheme) => ({ [scheme]: [] })),
      ...(parameters.length === 0 ? {} : { parameters }),
      ...(body === undefined ? {} : { requestBody: body }),
      responses: {
        [route.status]: {
          description: route.status === 201 ? "Created." : "OK.",
          content: { "application/json": { schema: { $ref: SCHEMAS + response } } },
        },
        ...(schemes.length === 0 ? {} : { "401": { $ref: ERROR } }),
        "4XX": { $ref: ERROR },
        "5XX": { $ref: ERROR },
      },
    };
    const method = route.method.toLowerCase();
    const taken = paths[route.path]?.[method]?.["operationId"];
    if (taken !== undefined) {
      throw new RouteTableError(`${operationId}: ${route.method} ${route.path} is also ${taken}`);
    }
    paths[route.path] = { ...paths[route.path], [method]: operation };
  }

  const error: Json = {
    description: `An error: \`{error: {type, message}}\`. The type names the cause, and answers with one status:\n\n${errorTable()}`,
    content: { "application/json": { schema: { $ref: `${SCHEMAS}ErrorEnvelope` } } },
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "Jadwigo API",
      version: "v1",
      description:
        "The API behind app.jadwigo.pl: attempts at lessons, the parent screens and the question bank. Every request and reply body is JSON.",
    },
    tags: ROUTE_TAGS.map((name) => ({ name })),
    paths,
    components: {
      schemas: reached({ paths, error }, all),
      responses: { Error: error },
      securitySchemes: SECURITY_SCHEMES,
    },
  };
}
