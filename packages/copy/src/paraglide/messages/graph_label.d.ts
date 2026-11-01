/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ max: NonNullable<unknown> }} Graph_LabelInputs */
/**
* | output |
* | --- |
* | "Graph from 0 to {max}" |
*
* @param {Graph_LabelInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const graph_label: ((inputs: Graph_LabelInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Graph_LabelInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Graph_LabelInputs = {
    max: NonNullable<unknown>;
};
