// infra/Makefile's deploy-all and prod-status (dl-5ssh.34.65). deploy-all's dry run names the 4
// halves, each refuses an agent's shell before anything else, and each stamps the commit it ships.
// prod-status runs against stub curl and aws on a throwaway repo: a stamped service counts the
// commits since its stamp, an unstamped one counts from its last-modified date. Nothing uploads.
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const infra = join(repo, "infra");

function git(cwd: string, ...args: string[]) {
  const out = spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      PATH: "/usr/bin:/bin",
      HOME: cwd,
      GIT_AUTHOR_NAME: "t",
      GIT_AUTHOR_EMAIL: "t@example.invalid",
      GIT_COMMITTER_NAME: "t",
      GIT_COMMITTER_EMAIL: "t@example.invalid",
      GIT_AUTHOR_DATE: "2026-10-01T00:00:00Z",
      GIT_COMMITTER_DATE: "2026-10-01T00:00:00Z",
    },
  });
  return out.stdout.trim();
}

describe("make -C infra deploy-all", () => {
  const run = spawnSync("make", ["-n", "-C", infra, "deploy-all"], {
    encoding: "utf8",
    env: { PATH: "/usr/bin:/bin" },
  });
  const lines = run.stdout.split("\n");

  it("dry-runs the api, the web, the site and the docs, each refused from an agent's shell", () => {
    expect(run.status).toBe(0);
    for (const half of ["api-deploy", "web-deploy", "site-deploy", "docs-deploy"]) {
      expect(lines.some((l) => l.includes(`echo "${half}: the owner deploys`))).toBe(true);
    }
  });

  it("stamps each service with the commit it ships", () => {
    const stamped = lines.filter((l) => l.includes("git rev-parse HEAD"));
    expect(stamped.some((l) => l.includes("version/api.txt"))).toBe(true);
    expect(stamped.some((l) => l.includes("dist/version/web.txt"))).toBe(true);
    expect(stamped.some((l) => l.includes("apps/site/dist/version.txt"))).toBe(true);
    expect(stamped.some((l) => l.includes("apps/docs/dist/version.txt"))).toBe(true);
  });

  it("web-deploy's delete keeps the api's stamp", () => {
    const sync = lines.find(
      (l) => l.includes("s3 sync ../apps/web/dist ") && l.includes("--delete"),
    );
    expect(sync).toContain('--exclude "version/api.txt"');
  });
});

describe("infra/prod-status.sh", () => {
  it("counts commits since a stamp, and since last-modified when there is none", () => {
    const dir = mkdtempSync(join(tmpdir(), "prod-status-"));
    const work = join(dir, "repo");
    mkdirSync(join(work, "apps/api"), { recursive: true });
    mkdirSync(join(work, "apps/site"), { recursive: true });
    git(work, "init", "-q", "-b", "main");
    writeFileSync(join(work, "apps/api/a"), "1");
    writeFileSync(join(work, "apps/site/s"), "1");
    git(work, "add", "apps");
    git(work, "commit", "-qm", "one");
    const first = git(work, "rev-parse", "HEAD");
    writeFileSync(join(work, "apps/api/a"), "2");
    git(work, "commit", "-qam", "two");

    const bin = join(dir, "bin");
    mkdirSync(bin);
    // curl: the api has a stamp at the first commit; the site answers a header only; the rest fail.
    writeFileSync(
      join(bin, "curl"),
      `#!/bin/sh
for a; do url=$a; done
case $url in
  */version/api.txt) echo "${first} 2026-10-01T00:00:00Z" ;;
  https://site.invalid/) printf 'HTTP/2 200\\r\\nLast-Modified: Wed, 30 Sep 2026 00:00:00 GMT\\r\\n\\r\\n' ;;
  *) exit 22 ;;
esac
`,
    );
    writeFileSync(join(bin, "aws"), "#!/bin/sh\nexit 255\n");
    chmodSync(join(bin, "curl"), 0o755);
    chmodSync(join(bin, "aws"), 0o755);

    const out = spawnSync("sh", [join(infra, "prod-status.sh")], {
      cwd: work,
      encoding: "utf8",
      env: {
        PATH: `${bin}:/usr/bin:/bin`,
        HOME: dir,
        JW_REF: "main",
        JW_APP_URL: "https://app.invalid",
        JW_SITE_URL: "https://site.invalid",
        JW_DOCS_URL: "https://docs.invalid",
      },
    });
    expect(out.status).toBe(0);
    const row = (name: string) => out.stdout.split("\n").find((l) => l.startsWith(`${name} `));
    expect(row("api")).toMatch(new RegExp(`^api +${first.slice(0, 7)}.* 1$`));
    expect(row("site")).toMatch(/^site +unstamped, modified .* 1$/);
    expect(row("web")).toMatch(/^web +unknown +\?$/);
    expect(out.stdout).toContain("behind or unknown");
  });
});
