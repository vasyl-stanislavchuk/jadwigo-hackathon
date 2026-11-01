// The brand's SVGs as text (Vite's ?raw), so a part can inline them and the page's tokens and the
// crown's tip reach inside (README.md here).
declare module "*.svg?raw" {
  const svg: string;
  export default svg;
}
