// The public surface: the typed /api/v1 client the web app, the CLI and MCP share.
export type {
  AttachmentClient,
  AttemptClient,
  Client,
  ClientOptions,
  ConversationClient,
  ConversationListClient,
  FeaturedClient,
  LearnerKnowledgeClient,
  ParentClient,
  PlaygroundClient,
  PodClient,
  RunRatingClient,
} from "./client.ts";
export { ApiError, createClient, TransientError } from "./client.ts";
export { apiUrl } from "./url.ts";
