// The public surface: the typed /api/v1 client the web app, the CLI and MCP share.
export type {
  AssignmentIntroClient,
  AssignmentPrintClient,
  AttachmentClient,
  AttemptClient,
  Client,
  ClientOptions,
  ConversationClient,
  ConversationListClient,
  FeaturedClient,
  LearnerKnowledgeClient,
  LessonGiveClient,
  LessonPrintClient,
  ParentClient,
  PlaygroundClient,
  PodClient,
  RunRatingClient,
} from "./client.ts";
export {
  ApiError,
  createClient,
  TransientError,
  waitForAssignmentPrint,
  waitForPrint,
} from "./client.ts";
export { apiUrl } from "./url.ts";
