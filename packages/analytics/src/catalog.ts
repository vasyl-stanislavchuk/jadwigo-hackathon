/**
 * The event catalogue: every event the site or the app sends, each with the question it answers
 * and a meaning for every property, after md's telemetry/catalog.py (decision dl-376c8).
 * `before_send` drops any event or key that is not here, and catalog.test.ts refuses a key or a
 * value that could carry a learner's name, answer, id or score.
 */
import { LANGUAGE_CODES } from "@jadwigo/config";

export type Surface = "site" | "app";

/** A property's allowed values: a boolean, or one of a closed set. There is no free string. */
export type PropSpec =
  | { readonly kind: "boolean"; readonly meaning: string }
  | { readonly kind: "enum"; readonly values: readonly string[]; readonly meaning: string };

export type EventSpec = {
  readonly question: string;
  readonly surfaces: readonly Surface[];
  readonly props: Readonly<Record<string, PropSpec>>;
};

const locale = {
  kind: "enum",
  values: LANGUAGE_CODES,
  meaning: "the language the page is in",
} as const satisfies PropSpec;

export const CATALOG = {
  featured_lesson_opened: {
    question: "Do visitors open a featured lesson from the site, and in which language?",
    surfaces: ["site"],
    props: { locale },
  },
  lesson_filter_applied: {
    question: "Which of the gallery's filters do visitors use?",
    surfaces: ["site"],
    props: {
      locale,
      filter: { kind: "enum", values: ["grade", "subject"], meaning: "the filter changed" },
    },
  },
  hero_question_answered: {
    question: "Do visitors try the landing page's example question?",
    surfaces: ["site"],
    props: { locale },
  },
  email_sign_in_submitted: {
    question: "Does the site's sign-in page hand parents to the app by email?",
    surfaces: ["site"],
    props: { locale },
  },
  provider_sign_in_selected: {
    question: "Which provider do parents pick on the site's sign-in page?",
    surfaces: ["site"],
    props: {
      locale,
      provider: { kind: "enum", values: ["google", "facebook"], meaning: "the provider's button" },
    },
  },
  parent_signed_in: {
    question: "How do parents sign in?",
    surfaces: ["app"],
    props: {
      sign_in_method: {
        kind: "enum",
        values: ["email_code", "oauth"],
        meaning: "a 6-digit email code, or a provider's redirect",
      },
    },
  },
  learner_created: {
    question: "Do parents add their children, and do they give a school grade?",
    surfaces: ["app"],
    props: {
      has_school_grade: { kind: "boolean", meaning: "the parent picked a grade" },
    },
  },
  lesson_conversation_started: {
    question: "Do parents ask Jadwigo AI for lessons, and with photos or for a child?",
    surfaces: ["app"],
    props: {
      has_attachments: { kind: "boolean", meaning: "the request carried photos" },
      has_learner: { kind: "boolean", meaning: "the request named one of the parent's children" },
    },
  },
  ai_consent_granted: {
    question: "Do parents agree to Jadwigo AI?",
    surfaces: ["app"],
    props: {},
  },
  chat_response_rated: {
    question: "Do parents find Jadwigo AI's answers good?",
    surfaces: ["app"],
    props: {
      verdict: {
        kind: "enum",
        values: ["good", "bad"],
        meaning: "the parent's rating of one turn",
      },
    },
  },
} as const satisfies Record<string, EventSpec>;

export type EventName = keyof typeof CATALOG;

type ValueOf<P> = P extends { kind: "boolean" }
  ? boolean
  : P extends { kind: "enum"; values: readonly (infer V)[] }
    ? V
    : never;

/** The properties an event takes, typed from its catalogue entry. */
export type PropsOf<E extends EventName> = {
  [K in keyof (typeof CATALOG)[E]["props"]]: ValueOf<(typeof CATALOG)[E]["props"][K]>;
};

export function isEventName(name: string): name is EventName {
  return Object.hasOwn(CATALOG, name);
}
