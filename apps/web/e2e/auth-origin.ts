// Where e2e/auth-server.ts, the browser tests' stand-in for Supabase Auth, listens. Apart from the
// server so playwright.config.ts can name it without starting it.
export const AUTH_PORT = 54321;
export const AUTH_ORIGIN = `http://127.0.0.1:${AUTH_PORT}`;
