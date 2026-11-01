/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown>, line: 0 | "0" | 1 | "1" }} Try_AgainInputs */
/**
* | category | line | output |
* | --- | --- | --- |
* | "adult" | "0" | "Not quite. Have another go." |
* | "adult" | "1" | "Take another look and try again." |
* | * | "0" | "Let's try that one again." |
* | * | "1" | "Take another look — you can do it." |
*
* @param {Try_AgainInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const try_again: ((inputs: Try_AgainInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Try_AgainInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Try_AgainInputs = {
    category: NonNullable<unknown>;
    line: 0 | "0" | 1 | "1";
};
