import type { HttpMuseOptions } from "./http.ts";

/**
 * Recorded `/v1/responses` streams for the HttpMuse tests, written by hand from the documented
 * event shapes and the ones `jadwigo-bank/experiments/direct_api` saw (`response.output_text.delta`,
 * `response.output_item.done`, `response.completed` with `usage.input_tokens_details`). Replace
 * them with the dl-z5ja.3 probe's recording once the owner has run it. Test files only.
 */

export interface Sent {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
  raw: string;
}

/** A server-sent event stream: one `event:` and one `data:` line per event. */
function sse(events: readonly Record<string, unknown>[]): string {
  return events.map((e) => `event: ${String(e["type"])}\ndata: ${JSON.stringify(e)}\n\n`).join("");
}

const usage = (input: number, cached: number, output: number) => ({
  input_tokens: input,
  input_tokens_details: { cached_tokens: cached },
  output_tokens: output,
  output_tokens_details: { reasoning_tokens: 12 },
});

/** A text answer in 3 deltas, 1200 tokens in (200 cached), 300 out. */
export function textAnswer(deltas: readonly string[], id = "resp_rec_1"): string {
  const text = deltas.join("");
  return sse([
    { type: "response.created", response: { id, model: "muse-spark-1.3-contributor" } },
    ...deltas.map((delta) => ({ type: "response.output_text.delta", item_id: "msg_1", delta })),
    {
      type: "response.output_item.done",
      item: { type: "message", id: "msg_1", content: [{ type: "output_text", text }] },
    },
    {
      type: "response.completed",
      response: {
        id,
        model: "muse-spark-1.3-contributor",
        status: "completed",
        output: [{ type: "message", id: "msg_1", content: [{ type: "output_text", text }] }],
        usage: usage(1200, 200, 300),
      },
    },
  ]);
}

/** A function call to `verb`, its arguments streamed in 2 deltas. */
export function callAnswer(verb: string, args: Record<string, unknown>, id = "resp_rec_2"): string {
  const json = JSON.stringify(args);
  const item = {
    type: "function_call",
    id: "fc_1",
    call_id: "call_rec_1",
    name: verb,
    arguments: json,
  };
  return sse([
    { type: "response.created", response: { id } },
    { type: "response.output_item.added", item: { ...item, arguments: "" } },
    { type: "response.function_call_arguments.delta", item_id: "fc_1", delta: json.slice(0, 5) },
    { type: "response.function_call_arguments.delta", item_id: "fc_1", delta: json.slice(5) },
    { type: "response.function_call_arguments.done", item_id: "fc_1", arguments: json },
    { type: "response.output_item.done", item },
    {
      type: "response.completed",
      response: { id, status: "completed", output: [item], usage: usage(900, 0, 40) },
    },
  ]);
}

/** A stream that failed after it started: billed for what it read. */
export function failedAnswer(): string {
  return sse([
    { type: "response.created", response: { id: "resp_fail" } },
    {
      type: "response.failed",
      response: { id: "resp_fail", error: { code: "server_error" }, usage: usage(1000, 0, 0) },
    },
  ]);
}

export type Reply = { status: number; body: string; chunk?: number } | Error;

/** A fetch that answers from a script and records what it was sent, in arbitrary-sized chunks. */
export function scriptedFetch(replies: Reply[]): { fetch: HttpMuseOptions["fetch"]; sent: Sent[] } {
  const sent: Sent[] = [];
  const fetch: HttpMuseOptions["fetch"] = (url, init) => {
    const raw = String(init.body);
    sent.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(raw) as Record<string, unknown>,
      raw,
    });
    const reply = replies.shift();
    if (reply === undefined) return Promise.reject(new Error("the scripted fetch ran out"));
    if (reply instanceof Error) return Promise.reject(reply);
    const bytes = new TextEncoder().encode(reply.body);
    const size = reply.chunk ?? 7;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (let i = 0; i < bytes.length; i += size) controller.enqueue(bytes.slice(i, i + size));
        controller.close();
      },
    });
    return Promise.resolve(new Response(stream, { status: reply.status }));
  };
  return { fetch, sent };
}
