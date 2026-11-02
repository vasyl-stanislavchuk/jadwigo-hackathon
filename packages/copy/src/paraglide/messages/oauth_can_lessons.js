/* eslint-disable */
import { getLocale, experimentalStaticLocale } from '../runtime.js';

/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */

/** @typedef {{}} Oauth_Can_LessonsInputs */



/**
* | output |
* | --- |
* | "make lessons and give them to your children" |
*
* @param {Oauth_Can_LessonsInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const oauth_can_lessons = /** @type {((inputs?: Oauth_Can_LessonsInputs, options?: { locale?: "pl" | "en" }) => LocalizedString) & import('../runtime.js').MessageMetadata<Oauth_Can_LessonsInputs, { locale?: "pl" | "en" }, {}>} */ ((inputs = {}, options = {}) => {
	void inputs;
	const locale = experimentalStaticLocale ?? options.locale ?? getLocale()
	if (locale === "en") return /** @type {LocalizedString} */ ("make lessons and give them to your children")
	return /** @type {LocalizedString} */ ("tworzyć lekcje i dawać je dzieciom")
});