/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

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
export const graph_label = /** @type {((inputs: Graph_LabelInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Graph_LabelInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Graph from 0 to ${i?.max}`)
	return /** @type {LocalizedString} */ (`Wykres od 0 do ${i?.max}`)
});