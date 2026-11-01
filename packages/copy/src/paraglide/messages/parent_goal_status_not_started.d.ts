/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Goal_Status_Not_StartedInputs */
/**
* | output |
* | --- |
* | "Not started yet" |
*
* @param {Parent_Goal_Status_Not_StartedInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_goal_status_not_started: ((inputs?: Parent_Goal_Status_Not_StartedInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Goal_Status_Not_StartedInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Goal_Status_Not_StartedInputs = {};
