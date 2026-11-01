/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{ from: NonNullable<unknown>, to: NonNullable<unknown> }} Parent_Report_PeriodInputs */
/**
* | output |
* | --- |
* | "{from} to {to}" |
*
* @param {Parent_Report_PeriodInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const parent_report_period: ((inputs: Parent_Report_PeriodInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Parent_Report_PeriodInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Parent_Report_PeriodInputs = {
    from: NonNullable<unknown>;
    to: NonNullable<unknown>;
};
