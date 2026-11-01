/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ n: NonNullable<unknown> }} Parent_Overview_PlayerInputs */
/**
* | output |
* | --- |
* | "Player {n}" |
*
* @param {Parent_Overview_PlayerInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_overview_player: ((inputs: Parent_Overview_PlayerInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Overview_PlayerInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Overview_PlayerInputs = {
    n: NonNullable<unknown>;
};
