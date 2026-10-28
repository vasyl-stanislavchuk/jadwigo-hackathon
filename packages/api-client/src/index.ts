// The public surface: the typed /api/v1 client the web app, the CLI and MCP share.
export type {
  AttemptClient,
  Client,
  ClientOptions,
  FeaturedClient,
  ParentClient,
} from "./client.ts";
export { ApiError, createClient, TransientError } from "./client.ts";
export { apiUrl } from "./url.ts";
