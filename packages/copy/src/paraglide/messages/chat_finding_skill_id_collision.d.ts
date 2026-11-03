/** @typedef {import('../runtime.js').LocalizedString} LocalizedString */
/** @typedef {{}} Chat_Finding_Skill_Id_CollisionInputs */
/**
* | output |
* | --- |
* | "Two skills have the same name." |
*
* @param {Chat_Finding_Skill_Id_CollisionInputs} inputs
* @param {{ locale?: "pl" | "en" }} options
* @returns {LocalizedString}
*/
export const chat_finding_skill_id_collision: ((inputs?: Chat_Finding_Skill_Id_CollisionInputs, options?: {
    locale?: "pl" | "en";
}) => LocalizedString) & import("../runtime.js").MessageMetadata<Chat_Finding_Skill_Id_CollisionInputs, {
    locale?: "pl" | "en";
}, {}>;
export type LocalizedString = import("../runtime.js").LocalizedString;
export type Chat_Finding_Skill_Id_CollisionInputs = {};
