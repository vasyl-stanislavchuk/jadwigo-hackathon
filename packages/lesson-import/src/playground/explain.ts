// The explain family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const EXPLAIN_EXAMPLES: WrittenExample[] = [
  {
    id: "why-turnaround",
    label: "Why a fact turns around: 3 × 4 and 4 × 3",
    question: {
      question_type: "explain",
      family: "explain",
      say: {
        pl: "Dlaczego 3 × 4 to tyle samo co 4 × 3? Napisz własnymi słowami.",
        en: "Why is 3 × 4 the same as 4 × 3? Write it in your own words.",
      },
      data: {
        input: "text",
      },
      key: {
        criteria: [
          {
            id: "k1",
            text: "Says that the two give the same number: swapping the factors does not change the product.",
            cite: 'CCSS 3.OA.B.5, the commutative property as a strategy ("if 6 × 4 = 24 is known, then 4 × 6 = 24 is also known"). docs/05-pedagogy.md §5.8, commutativity',
          },
          {
            id: "k2",
            text: "Gives a reason, not only the claim: an array turned on its side, or 3 groups of 4 and 4 groups of 3 counting the same things.",
            cite: "CCSS 3.OA.A.3, arrays and equal groups as the models of multiplication. Rittle-Johnson 2006 (Child Development 77), self-explanation of why beyond what",
          },
        ],
        criteria_version: "draft-2",
      },
      help: {
        look: {
          text: {
            pl: "Pomyśl o 3 × 4 jak o rzędach kropek.",
            en: "Think of 3 × 4 as rows of dots.",
          },
        },
        boost: {
          text: {
            pl: "Obróć obrazek na bok. Dokończ zdanie: „Kropek jest tyle samo, bo…”",
            en: 'Turn the picture on its side. Finish the sentence: "There are just as many dots, because…"',
          },
          picture: {
            kind: "dots",
            rows: 3,
            cols: 4,
            alt: {
              pl: "Trzy rzędy po cztery kropki",
              en: "Three rows of four dots",
            },
          },
        },
        almost: [
          {
            pl: "3 rzędy po 4 kropki, obrócone na bok, to 4 rzędy po 3.",
            en: "3 rows of 4 dots, turned on their side, are 4 rows of 3.",
          },
          {
            pl: "Kropek jest tyle samo, więc □",
            en: "There are just as many dots, so □",
          },
        ],
        worked: [
          {
            pl: "3 rzędy po 4 kropki, obrócone na bok, to 4 rzędy po 3.",
            en: "3 rows of 4 dots, turned on their side, are 4 rows of 3.",
          },
          {
            pl: "Kropek jest tyle samo, więc 3 × 4 i 4 × 3 to ta sama liczba.",
            en: "There are just as many dots, so 3 × 4 and 4 × 3 are the same number.",
          },
        ],
      },
    },
    scenarios: [
      {
        try: {
          pl: "Napisz: „Bo to te same kropki, tylko obrócone. Wychodzi 12.” Włącz oba kryteria, potem {check}",
          en: 'Write: "Because they are the same dots, only turned. It makes 12." Switch on both criteria, then {check}',
        },
        value: {
          text: "Bo to te same kropki, tylko obrócone. Wychodzi 12.",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Napisz: „Bo wychodzi tyle samo.” Włącz tylko pierwsze kryterium, potem {check}",
          en: 'Write: "Because it comes out the same." Switch on only the first criterion, then {check}',
        },
        value: {
          text: "Bo wychodzi tyle samo.",
        },
        outcome: "incorrect",
        mistake_class: "criterion_missed",
        marks: [],
      },
      {
        try: {
          pl: "Napisz jedno słowo i naciśnij {check}: prośba o trochę więcej, potem {check} jeszcze raz",
          en: "Write one word and press {check}: an ask for a little more, then {check} again",
        },
        value: {
          text: "Bo.",
        },
        outcome: "incorrect",
        mistake_class: "criterion_missed",
        marks: [],
      },
    ],
  },
];
