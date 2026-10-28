// The bundle `make api-bundle` wrote, invoked as Lambda would: an API Gateway v2 event for
// GET /api/health in a fresh process. Prints the status, the body and the cold start (the
// import, then the first invoke). `make api-invoke` runs it; no AWS.
const bundle = new URL("../dist/index.mjs", import.meta.url);
const started = performance.now();
const { handler } = await import(bundle.href);
const imported = performance.now();
const reply = await handler(
  {
    version: "2.0",
    routeKey: "GET /api/health",
    rawPath: "/api/health",
    rawQueryString: "",
    headers: {},
    requestContext: { http: { method: "GET", path: "/api/health" }, stage: "$default" },
    isBase64Encoded: false,
  },
  {},
);
const done = performance.now();
process.stdout.write(
  `${JSON.stringify({
    statusCode: reply.statusCode,
    body: reply.body,
    importMs: Math.round(imported - started),
    firstInvokeMs: Math.round(done - imported),
  })}\n`,
);
process.exit(reply.statusCode === 200 ? 0 : 1);
