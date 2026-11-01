/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{ row: NonNullable<unknown> }} Table_RowInputs */



/**
* | output |
* | --- |
* | "Times table: the {row}s" |
*
* @param {Table_RowInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const table_row = /** @type {((inputs: Table_RowInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Table_RowInputs, { locale?: "pl" | "en" }, {}>} */ ((i, options = {}) => {
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ (`Times table: the ${i?.row}s`)
	return /** @type {LocalizedString} */ (`Tabliczka mnożenia, rząd ${i?.row}`)
});