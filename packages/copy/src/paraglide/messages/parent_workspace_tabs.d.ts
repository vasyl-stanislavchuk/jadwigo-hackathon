/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Parent_Workspace_TabsInputs */
/**
* | output |
* | --- |
* | "Chat and lesson" |
*
* @param {Parent_Workspace_TabsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_workspace_tabs: ((inputs?: Parent_Workspace_TabsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Workspace_TabsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Workspace_TabsInputs = {};
