export type LocalizedString = import("../runtime.js").LocalizedString;
export type _ContinueInputs = {};
/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} _ContinueInputs */
/**
* | output |
* | --- |
* | "Next" |
*
* @param {_ContinueInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
declare const _continue: ((inputs?: _ContinueInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<_ContinueInputs, {
    locale?: "pl" | "en";
}, {}>;
export { _continue as "continue" };
