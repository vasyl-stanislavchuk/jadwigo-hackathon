/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown>, n: NonNullable<unknown> }} Chat_Week_MetaInputs */
/**
* | lessons_noun | output |
* | --- | --- |
* | "one" | "{from} – {to} · {n} lesson" |
* | "other" | "{from} – {to} · {n} lessons" |
*
* @param {Chat_Week_MetaInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_week_meta: ((inputs: Chat_Week_MetaInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Week_MetaInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Week_MetaInputs = {
    from: NonNullable<unknown>;
    to: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
