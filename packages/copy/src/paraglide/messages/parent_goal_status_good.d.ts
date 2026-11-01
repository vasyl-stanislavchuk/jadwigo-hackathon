/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Goal_Status_GoodInputs */
/**
* | output |
* | --- |
* | "Going well" |
*
* @param {Parent_Goal_Status_GoodInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_good: ((inputs?: Parent_Goal_Status_GoodInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Goal_Status_GoodInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Goal_Status_GoodInputs = {};
