// Where e2e/auth-server.ts, the stand-in for Supabase Auth, listens: md's AUTH_PORT in a worktree,
// 54321 in the main checkout and CI (tools/src/ports.ts). Apart from the server so
// playwright.config.ts can name it without starting it.
import { DEV_PORTS, port } from "../../../tools/src/ports.ts";

export const AUTH_PORT = port("AUTH_PORT", DEV_PORTS.AUTH_PORT);
export const AUTH_ORIGIN = `http://127.0.0.1:${AUTH_PORT}`;
