/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ category: NonNullable<unknown> }} Session_FinishedInputs */
/**
* | category | output |
* | --- | --- |
* | "adult" | "This lesson is finished. You can start it again." |
* | * | "This lesson is finished. Thank you for practicing!" |
*
* @param {Session_FinishedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const session_finished: ((inputs: Session_FinishedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Session_FinishedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Session_FinishedInputs = {
    category: NonNullable<unknown>;
};
