/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Ds_Wait_ExplainInputs */
/**
* | output |
* | --- |
* | "Write or say your explanation." |
*
* @param {Ds_Wait_ExplainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const ds_wait_explain: ((inputs?: Ds_Wait_ExplainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Ds_Wait_ExplainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Ds_Wait_ExplainInputs = {};
