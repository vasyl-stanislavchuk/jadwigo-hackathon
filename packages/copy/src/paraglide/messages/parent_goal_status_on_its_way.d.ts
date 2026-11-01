/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Goal_Status_On_Its_WayInputs */
/**
* | output |
* | --- |
* | "On its way" |
*
* @param {Parent_Goal_Status_On_Its_WayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_on_its_way: ((inputs?: Parent_Goal_Status_On_Its_WayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Goal_Status_On_Its_WayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Goal_Status_On_Its_WayInputs = {};
