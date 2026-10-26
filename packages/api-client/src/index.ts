/** Join the API's base URL and a route path without doubling or dropping the slash. */
export function apiUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
