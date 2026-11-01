// Vite turns an imported .mov into its URL, as it does a .webm; Astro's types declare only the second.
declare module "*.mov" {
  const src: string;
  export default src;
}
