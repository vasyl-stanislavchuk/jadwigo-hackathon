// The brand's SVGs as text (Vite's ?raw), so a part can inline them and the page's tokens and the
// crown's tip reach inside (README.md here).
declare module "*.svg?raw" {
  const svg: string;
  export default svg;
}

// A brand SVG as a URL, for an <img> (the loading cast, dl-7wlo.44): its CSS stays inside the file.
// apps/web gets the same from vite/client.
declare module "*.svg" {
  const url: string;
  export default url;
}
