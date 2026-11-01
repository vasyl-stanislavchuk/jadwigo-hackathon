/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} No_Voice_TodayInputs */
/**
* | output |
* | --- |
* | "No voice today" |
*
* @param {No_Voice_TodayInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const no_voice_today: ((inputs?: No_Voice_TodayInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<No_Voice_TodayInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type No_Voice_TodayInputs = {};
