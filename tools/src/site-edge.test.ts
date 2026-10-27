// The site distribution's viewer-request function (infra/terraform/modules/site/edge.js), run as
// CloudFront runs it: Terraform prepends the apex, then handler(event) is called.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Request = {
  uri: string;
  headers: Record<string, { value: string }>;
  querystring: Record<string, { value: string }>;
};
type Redirect = { statusCode: number; headers: { location: { value: string } } };

const source = readFileSync(
  new URL("../../infra/terraform/modules/site/edge.js", import.meta.url),
  "utf8",
);
const handler = new Function(
  `const apex = "jadwigo.pl";\n${source}\nreturn handler;`,
)() as (event: { request: Request }) => Request | Redirect;

const run = (host: string, uri: string, qs: Record<string, string> = {}) =>
  handler({
    request: {
      uri,
      headers: { host: { value: host } },
      querystring: Object.fromEntries(Object.entries(qs).map(([k, v]) => [k, { value: v }])),
    },
  });

describe("site edge", () => {
  it("sends www to the apex with a 301, keeping the path and query", () => {
    const res = run("www.jadwigo.pl", "/a", { x: "1" }) as Redirect;
    expect(res.statusCode).toBe(301);
    expect(res.headers.location.value).toBe("https://jadwigo.pl/a?x=1");
  });

  it("maps a page path on the apex to its index.html", () => {
    expect((run("jadwigo.pl", "/") as Request).uri).toBe("/index.html");
    expect((run("jadwigo.pl", "/jak-to-dziala") as Request).uri).toBe("/jak-to-dziala/index.html");
    expect((run("jadwigo.pl", "/jak-to-dziala/") as Request).uri).toBe("/jak-to-dziala/index.html");
  });

  it("leaves a file path alone", () => {
    for (const uri of ["/robots.txt", "/sitemap-index.xml", "/_astro/a.b1c2.css"]) {
      expect((run("jadwigo.pl", uri) as Request).uri).toBe(uri);
    }
  });
});
