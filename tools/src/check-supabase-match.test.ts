// Planted drifts for check-supabase-match.ts (dl-5ssh.34.54). The facts are made up; nothing here
// reaches Supabase or a database.
import { describe, expect, it } from "vitest";
import { compare, type Facts, parseFacts, usedExtensions } from "./check-supabase-match.ts";

const prod: Facts = parseFacts({
  serverMajor: 17,
  extensions: {
    pgtap: "1.3.3",
    vector: "0.8.2",
    pgcrypto: "1.3",
    "uuid-ossp": "1.1",
    pg_cron: "1.6",
  },
  roles: { anon: false, authenticated: false, authenticator: false, service_role: true },
  authFunctions: { uid: "uuid", jwt: "jsonb", role: "text", email: "text" },
});

const used = usedExtensions([
  "create extension if not exists pgcrypto;\n",
  "create extension pg_cron;\n",
  'CREATE EXTENSION IF NOT EXISTS "pgtap";\n',
]);

describe("check-supabase-match", () => {
  it("finds the extensions the repo's SQL creates", () => {
    expect([...used].sort()).toEqual(["pg_cron", "pgcrypto", "pgtap"]);
  });

  it("the same facts match", () => {
    expect(compare(prod, prod, used)).toEqual({ drifts: [], notes: [] });
  });

  it("fails a planted drift in each kind of fact", () => {
    const local = parseFacts({
      serverMajor: 18,
      extensions: { ...prod.extensions, pgtap: "1.3.4", "uuid-ossp": null },
      roles: { ...prod.roles, service_role: false, authenticator: null },
      authFunctions: { ...prod.authFunctions, uid: "text", email: null },
    });
    const { drifts } = compare(local, prod, used);
    expect(drifts).toEqual([
      "server major version: local 18, Supabase 17",
      "extension pgtap: local 1.3.4, Supabase 1.3.3",
      "extension uuid-ossp: local missing, Supabase 1.1",
      "role authenticator bypassrls: local missing, Supabase false",
      "role service_role bypassrls: local false, Supabase true",
      "auth.uid() returns: local text, Supabase uuid",
      "auth.email() returns: local missing, Supabase text",
    ]);
  });

  it("notes, without failing, an accepted drift and a version of an extension nothing creates", () => {
    const local = parseFacts({
      ...prod,
      extensions: { ...prod.extensions, vector: "0.8.6", pg_cron: null },
    });
    const { drifts, notes } = compare(local, prod, used);
    expect(drifts).toEqual([]);
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatch(/^extension vector: local 0\.8\.6, Supabase 0\.8\.2 \(no migration/);
    expect(notes[1]).toMatch(/^extension pg_cron: local missing, Supabase 1\.6 \(accepted: /);
  });

  it("a facts object missing a name reads it as missing", () => {
    expect(parseFacts({ serverMajor: 17 }).roles["anon"]).toBeNull();
  });
});
