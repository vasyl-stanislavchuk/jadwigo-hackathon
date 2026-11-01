/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_ConsentInputs */
/**
* | output |
* | --- |
* | "The assistant reads only what your request about your child needs, names included. The model it runs on does not learn from it." |
*
* @param {Chat_ConsentInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_consent: ((inputs?: Chat_ConsentInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_ConsentInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_ConsentInputs = {};
