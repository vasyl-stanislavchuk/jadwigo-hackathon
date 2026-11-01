/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Clock_Points_BetweenInputs */
/**
* | output |
* | --- |
* | "between {from} and {to}" |
*
* @param {Clock_Points_BetweenInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const clock_points_between: ((inputs: Clock_Points_BetweenInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Clock_Points_BetweenInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Clock_Points_BetweenInputs = {
    from: NonNullable<unknown>;
    to: NonNullable<unknown>;
};
