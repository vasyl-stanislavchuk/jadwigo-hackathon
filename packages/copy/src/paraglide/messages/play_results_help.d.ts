/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Play_Results_HelpInputs */
/**
* | output |
* | --- |
* | "Help: {n}" |
*
* @param {Play_Results_HelpInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const play_results_help: ((inputs: Play_Results_HelpInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Play_Results_HelpInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Play_Results_HelpInputs = {
    n: NonNullable<unknown>;
};
