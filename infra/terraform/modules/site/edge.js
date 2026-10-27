// Viewer request on the site distribution. Terraform prepends `const apex = "<domain>";` (main.tf),
// so the file itself names no domain.
// - www.<apex> answers with a 301 to https://<apex>, keeping the path and query.
// - A page path maps to the index.html Astro writes for it (build.format "directory"):
//   /jak-to-dziala and /jak-to-dziala/ both read jak-to-dziala/index.html.
// CloudFront's cloudfront-js-2.0 runtime is not Node: it rejects optional chaining and nullish
// coalescing (tools/src/site-edge.test.ts keeps them out).
// biome-ignore lint/correctness/noUnusedVariables: CloudFront calls handler by name
function handler(event) {
  const request = event.request;
  // apex: defined by the line Terraform prepends
  const target = apex;
  const host = request.headers.host;
  if (host && host.value === `www.${target}`) {
    const query = Object.keys(request.querystring)
      .map((k) => `${k}=${request.querystring[k].value}`)
      .join("&");
    return {
      statusCode: 301,
      statusDescription: "Moved Permanently",
      headers: {
        location: { value: `https://${target}${request.uri}${query ? "?" : ""}${query}` },
      },
    };
  }
  const uri = request.uri;
  if (uri.endsWith("/")) request.uri = `${uri}index.html`;
  else if (!uri.slice(uri.lastIndexOf("/") + 1).includes(".")) request.uri = `${uri}/index.html`;
  return request;
}
