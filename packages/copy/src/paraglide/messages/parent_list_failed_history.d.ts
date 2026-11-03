/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_List_Failed_HistoryInputs */
/**
* | output |
* | --- |
* | "Couldn't load the history" |
*
* @param {Parent_List_Failed_HistoryInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_list_failed_history: ((inputs?: Parent_List_Failed_HistoryInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_List_Failed_HistoryInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_List_Failed_HistoryInputs = {};
