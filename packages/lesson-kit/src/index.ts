/** The interaction families a lesson block may use. dl-5ssh.34.6 moves the real ones in. */
export const FAMILIES = ["choice", "number", "sequence", "group"] as const;
export type Family = (typeof FAMILIES)[number];
