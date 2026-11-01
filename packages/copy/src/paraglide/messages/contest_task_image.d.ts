/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Contest_Task_ImageInputs */
/**
* | output |
* | --- |
* | "A task from the Alfik contest" |
*
* @param {Contest_Task_ImageInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const contest_task_image: ((inputs?: Contest_Task_ImageInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Contest_Task_ImageInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Contest_Task_ImageInputs = {};
