/** Join the API's base URL and a route path without doubling or dropping the slash. An empty base
 * keeps the path as it is, for the page's own origin. */
export function apiUrl(base: string, path: string): string {
  if (base === "") return `/${path.replace(/^\/+/, "")}`;
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
