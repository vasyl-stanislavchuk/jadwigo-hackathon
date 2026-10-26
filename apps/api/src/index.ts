/** The health route, until the router lands with the core port (dl-5ssh.34.5). */
export function health(): { status: "ok" } {
  return { status: "ok" };
}
