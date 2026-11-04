/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Crash_RetryInputs */
/**
* | output |
* | --- |
* | "Try again" |
*
* @param {Crash_RetryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const crash_retry: ((inputs?: Crash_RetryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Crash_RetryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Crash_RetryInputs = {};
