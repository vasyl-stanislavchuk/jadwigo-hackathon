// www.<apex> answers with a 301 to https://<apex>, keeping the path and query. Terraform
// prepends `const apex = "<domain>";` (main.tf), so the file itself names no domain.
// biome-ignore lint/correctness/noUnusedVariables: CloudFront calls handler by name
function handler(event) {
  const request = event.request;
  // biome-ignore lint/correctness/noUndeclaredVariables: defined by the line Terraform prepends
  const target = apex;
  if (request.headers.host?.value !== `www.${target}`) return request;
  const qs = Object.keys(request.querystring)
    .map((k) => `${k}=${request.querystring[k].value}`)
    .join("&");
  return {
    statusCode: 301,
    statusDescription: "Moved Permanently",
    headers: { location: { value: `https://${target}${request.uri}${qs ? `?${qs}` : ""}` } },
  };
}
