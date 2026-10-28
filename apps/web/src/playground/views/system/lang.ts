/** The System page's language switch (PL, EN): the parts draw their interface words in it. */

import type { Language } from "@jadwigo/copy";
import { createContext, useContext } from "react";

export const SystemLanguage = createContext<Language>("pl");

export const useSystemLanguage = (): Language => useContext(SystemLanguage);
