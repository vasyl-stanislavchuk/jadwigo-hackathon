/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Goal_Can_Do_NowInputs */
/**
* | output |
* | --- |
* | "Can do now" |
*
* @param {Parent_Goal_Can_Do_NowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_can_do_now: ((inputs?: Parent_Goal_Can_Do_NowInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Goal_Can_Do_NowInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Goal_Can_Do_NowInputs = {};
