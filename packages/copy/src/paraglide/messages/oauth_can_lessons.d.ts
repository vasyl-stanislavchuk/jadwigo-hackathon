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
export const oauth_can_lessons: ((inputs?: Oauth_Can_LessonsInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Oauth_Can_LessonsInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Oauth_Can_LessonsInputs = {};
