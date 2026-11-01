/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ max: NonNullable<unknown>, n: NonNullable<unknown> }} Attach_Left_OffInputs */
/**
* | n_noun | output |
* | --- | --- |
* | "one" | "{max} photos fit, {n} was left off" |
* | "other" | "{max} photos fit, {n} were left off" |
*
* @param {Attach_Left_OffInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const attach_left_off: ((inputs: Attach_Left_OffInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Attach_Left_OffInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Attach_Left_OffInputs = {
    max: NonNullable<unknown>;
    n: NonNullable<unknown>;
};
