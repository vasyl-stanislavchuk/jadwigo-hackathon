// The choose family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const CHOOSE_EXAMPLES: WrittenExample[] = [
  {
    id: "neighbour-row-claim",
    label:
      "True or false: a times-table claim built from the row next door (6 × 8 passed off as 7 × 6)",
    showcase: true,
    question: {
      question_type: "true_false",
      family: "choose",
      say: {
        pl: "Prawda czy fałsz? Siedem razy sześć to czterdzieści osiem.",
        en: "True or false? Seven times six is forty-eight.",
      },
      data: {
        stem: {
          text: "$7 \\times 6 = 48$",
        },
        options: [
          {
            id: "true",
            content: {
              kind: "bool",
              bool: true,
            },
          },
          {
            id: "false",
            content: {
              kind: "bool",
              bool: false,
            },
          },
        ],
        select: "one",
        layout: "binary",
      },
      key: {
        correct: ["false"],
        near: {
          true: "neighbour_row",
        },
      },
      help: {
        look: {
          text: {
            pl: "Zanim zdecydujesz, policz siedem razy sześć sam.",
            en: "Before you decide, work out seven times six yourself.",
          },
        },
        boost: {
          text: {
            pl: "7 × 6 to 7 × 5 i jeszcze jedna siódemka. 7 × 5 = 35. Dodaj jeszcze 7 i porównaj z 48.",
            en: "7 × 6 is 7 × 5 and one more seven. 7 × 5 = 35. Add one more 7 and compare with 48.",
          },
          picture: {
            kind: "dots",
            rows: 7,
            cols: 6,
            alt: {
              pl: "Siedem rzędów po sześć kropek",
              en: "Seven rows of six dots",
            },
          },
        },
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "48 to wynik z sąsiedniego rzędu, 8 × 6. Tu jest siedem szóstek, nie osiem.",
              en: "48 is the answer from the row next door, 8 × 6. Here there are seven sixes, not eight.",
            },
          },
        },
        worked: [
          "7 × 5 = 35",
          "35 + 7 = 42",
          {
            pl: "42 to nie 48, więc zdanie jest fałszywe",
            en: "42 is not 48, so the claim is false",
          },
        ],
        almost: ["7 × 5 = 35", "35 + 7 = □"],
      },
    },
    twin: {
      question_type: "true_false",
      family: "choose",
      say: {
        pl: "Prawda czy fałsz? Osiem razy siedem to pięćdziesiąt cztery.",
        en: "True or false? Eight times seven is fifty-four.",
      },
      data: {
        stem: {
          text: "$8 \\times 7 = 54$",
        },
        options: [
          {
            id: "true",
            content: {
              kind: "bool",
              bool: true,
            },
          },
          {
            id: "false",
            content: {
              kind: "bool",
              bool: false,
            },
          },
        ],
        select: "one",
        layout: "binary",
      },
      key: {
        correct: ["false"],
        near: {
          true: "neighbour_fact_swap",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij {no}",
          en: "Tap {no}",
        },
        value: {
          chosen: ["false"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij {yes} (48 to wynik z sąsiedniego rzędu: 8 × 6)",
          en: "Tap {yes} (48 is the answer from the row next door: 8 × 6)",
        },
        value: {
          chosen: ["true"],
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [
          {
            id: "true",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "turned-array-claim",
    label: "True or false about a picture: a turned array still shows 3 × 5",
    question: {
      question_type: "true_false",
      family: "choose",
      say: {
        pl: "Prawda czy fałsz? Te kropki pokazują trzy razy pięć.",
        en: "True or false? These dots show three times five.",
      },
      data: {
        stem: {
          text: {
            pl: "Te kropki pokazują $3 \\times 5$.",
            en: "These dots show $3 \\times 5$.",
          },
          figure: {
            kind: "dots",
            rows: 5,
            cols: 3,
            alt: {
              pl: "Kropki ułożone w równe rzędy",
              en: "Dots set out in equal rows",
            },
          },
        },
        options: [
          {
            id: "true",
            content: {
              kind: "bool",
              bool: true,
            },
          },
          {
            id: "false",
            content: {
              kind: "bool",
              bool: false,
            },
          },
        ],
        select: "one",
        layout: "binary",
      },
      key: {
        correct: ["true"],
        near: {
          false: "turned_array_rejected",
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz rzędy, a potem kropki w jednym rzędzie.",
            en: "Count the rows, then the dots in one row.",
          },
        },
        boost: {
          text: {
            pl: "Tu jest 5 rzędów po 3 kropki. Obróć kartkę bokiem w głowie: ile wtedy rzędów i po ile kropek?",
            en: "Here there are 5 rows of 3 dots. Turn the page on its side in your head: how many rows then, and how many dots in each?",
          },
        },
        boost_by_mistake: {
          turned_array_rejected: {
            text: {
              pl: "Obrócony prostokąt ma tyle samo kropek. 5 rzędów po 3 to po obróceniu 3 rzędy po 5.",
              en: "A turned rectangle has just as many dots. 5 rows of 3, turned, is 3 rows of 5.",
            },
          },
        },
        worked: [
          {
            pl: "5 rzędów po 3 kropki",
            en: "5 rows of 3 dots",
          },
          {
            pl: "Obrócone: 3 rzędy po 5 kropek",
            en: "Turned: 3 rows of 5 dots",
          },
          {
            pl: "Tak, kropki pokazują 3 × 5",
            en: "Yes, the dots show 3 × 5",
          },
        ],
      },
    },
    twin: {
      question_type: "true_false",
      family: "choose",
      say: {
        pl: "Prawda czy fałsz? Te kropki pokazują dwa razy sześć.",
        en: "True or false? These dots show two times six.",
      },
      data: {
        stem: {
          text: {
            pl: "Te kropki pokazują $2 \\times 6$.",
            en: "These dots show $2 \\times 6$.",
          },
          figure: {
            kind: "dots",
            rows: 6,
            cols: 2,
            alt: {
              pl: "Kropki ułożone w równe rzędy",
              en: "Dots set out in equal rows",
            },
          },
        },
        options: [
          {
            id: "true",
            content: {
              kind: "bool",
              bool: true,
            },
          },
          {
            id: "false",
            content: {
              kind: "bool",
              bool: false,
            },
          },
        ],
        select: "one",
        layout: "binary",
      },
      key: {
        correct: ["true"],
        near: {
          false: "turned_array_rejected",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij {yes}",
          en: "Tap {yes}",
        },
        value: {
          chosen: ["true"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij {no} (kropki stoją bokiem, więc wydają się inne)",
          en: "Tap {no} (the dots stand on their side, so they look different)",
        },
        value: {
          chosen: ["false"],
        },
        outcome: "incorrect",
        mistake_class: "turned_array_rejected",
        marks: [
          {
            id: "false",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "six-eights",
    label: "Pick the product of 6 × 8 from four numbers, each distractor a named mistake",
    showcase: true,
    question: {
      question_type: "recognition",
      family: "choose",
      say: {
        pl: "Ile to sześć razy osiem? Wybierz liczbę.",
        en: "What is six times eight? Pick the number.",
      },
      data: {
        stem: {
          text: "$6 \\times 8 = ?$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 42,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 48,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 14,
            },
          },
          {
            id: "o4",
            content: {
              kind: "number",
              number: 84,
            },
          },
        ],
        select: "one",
        layout: "grid",
      },
      key: {
        correct: ["o2"],
        near: {
          o1: "neighbour_row",
          o3: "add_for_multiply",
          o4: "digit_reversal",
        },
      },
      help: {
        look: {
          text: {
            pl: "Sprawdź każdą liczbę: która jest naprawdę sześć razy osiem?",
            en: "Check each number: which one really is six times eight?",
          },
          focus: ["o1", "o2", "o3", "o4"],
        },
        boost: {
          text: {
            pl: "Jedna liczba jest już zabrana. 6 × 8 to dwa razy 6 × 4, a 6 × 4 = 24.",
            en: "One number is taken away for you. 6 × 8 is 6 × 4 twice, and 6 × 4 = 24.",
          },
          picture: {
            kind: "dots",
            rows: 6,
            cols: 8,
            alt: {
              pl: "Sześć rzędów po osiem kropek",
              en: "Six rows of eight dots",
            },
          },
        },
        give: ["o3"],
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "To wynik z rzędu obok: 6 × 7. Dodaj jeszcze jedną szóstkę.",
              en: "That is the row next door: 6 × 7. Add one more six.",
            },
          },
          add_for_multiply: {
            text: {
              pl: "6 + 8 to dodawanie. Mnożenie to sześć ósemek, jedna po drugiej.",
              en: "6 + 8 is adding. Multiplying is six eights, one after another.",
            },
          },
          digit_reversal: {
            text: {
              pl: "Masz dobre cyfry, tylko zamienione miejscami. Która cyfra to dziesiątki?",
              en: "You have the right digits, only swapped round. Which digit is the tens?",
            },
          },
        },
        worked: ["6 × 4 = 24", "24 + 24 = 48", "6 × 8 = 48"],
        almost: ["6 × 4 = 24", "24 + 24 = □"],
      },
    },
    twin: {
      question_type: "recognition",
      family: "choose",
      say: {
        pl: "Ile to siedem razy osiem? Wybierz liczbę.",
        en: "What is seven times eight? Pick the number.",
      },
      data: {
        stem: {
          text: "$7 \\times 8 = ?$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 15,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 63,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 56,
            },
          },
          {
            id: "o4",
            content: {
              kind: "number",
              number: 65,
            },
          },
        ],
        select: "one",
        layout: "grid",
      },
      key: {
        correct: ["o3"],
        near: {
          o1: "add_for_multiply",
          o2: "neighbour_row",
          o4: "digit_reversal",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij 48",
          en: "Tap 48",
        },
        value: {
          chosen: ["o2"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij 42 (to 6 × 7, rząd obok)",
          en: "Tap 42 (that is 6 × 7, the row next door)",
        },
        value: {
          chosen: ["o1"],
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [
          {
            id: "o1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij 14 (dodane zamiast pomnożonych)",
          en: "Tap 14 (added, not multiplied)",
        },
        value: {
          chosen: ["o3"],
        },
        outcome: "incorrect",
        mistake_class: "add_for_multiply",
        marks: [
          {
            id: "o3",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij 84 (cyfry zamienione)",
          en: "Tap 84 (the digits swapped)",
        },
        value: {
          chosen: ["o4"],
        },
        outcome: "incorrect",
        mistake_class: "digit_reversal",
        marks: [
          {
            id: "o4",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "array-for-four-sixes",
    label:
      "Pick the rectangle of dots for 4 × 6: one row short, one row over, or the same total in other rows",
    showcase: true,
    question: {
      question_type: "recognition",
      family: "choose",
      say: {
        pl: "Który prostokąt z kropek pokazuje cztery razy sześć?",
        en: "Which dot rectangle shows four times six?",
      },
      data: {
        stem: {
          text: "$4 \\times 6$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "array",
              rows: 3,
              cols: 8,
            },
          },
          {
            id: "o2",
            content: {
              kind: "array",
              rows: 4,
              cols: 6,
            },
          },
          {
            id: "o3",
            content: {
              kind: "array",
              rows: 4,
              cols: 5,
            },
          },
          {
            id: "o4",
            content: {
              kind: "array",
              rows: 5,
              cols: 6,
            },
          },
        ],
        select: "one",
        layout: "grid",
      },
      key: {
        correct: ["o2"],
        near: {
          o1: "same_total_other_fact",
          o3: "one_column_short",
          o4: "one_row_extra",
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz rzędy w każdym prostokącie. Potrzebujesz czterech.",
            en: "Count the rows in each rectangle. You need four.",
          },
          focus: ["o1", "o2", "o3", "o4"],
        },
        boost: {
          text: {
            pl: "Jeden prostokąt jest już zabrany. Z tych, które mają 4 rzędy, wybierz ten, w którym każdy rząd ma 6 kropek.",
            en: "One rectangle is taken away for you. Of those with 4 rows, pick the one where every row has 6 dots.",
          },
        },
        give: ["o4"],
        boost_by_mistake: {
          same_total_other_fact: {
            text: {
              pl: "Ten ma tyle samo kropek, ale 3 rzędy. Szukamy 4 rzędów po 6.",
              en: "That one has as many dots, but 3 rows. We want 4 rows of 6.",
            },
          },
          one_column_short: {
            text: {
              pl: "Rzędów jest dobrze. Policz kropki w jednym rzędzie.",
              en: "The rows are right. Count the dots in one row.",
            },
          },
          one_row_extra: {
            text: {
              pl: "Policz rzędy jeszcze raz, palcem od góry.",
              en: "Count the rows once more, finger from the top.",
            },
          },
        },
        worked: [
          {
            pl: "4 × 6 to 4 rzędy po 6 kropek",
            en: "4 × 6 is 4 rows of 6 dots",
          },
          {
            pl: "Prostokąty z 4 rzędami: po 5 i po 6 kropek",
            en: "Rectangles with 4 rows: 5 dots each and 6 dots each",
          },
          {
            pl: "Ten z 6 kropkami w rzędzie",
            en: "The one with 6 dots in a row",
          },
        ],
      },
    },
    twin: {
      question_type: "recognition",
      family: "choose",
      say: {
        pl: "Który prostokąt z kropek pokazuje trzy razy pięć?",
        en: "Which dot rectangle shows three times five?",
      },
      data: {
        stem: {
          text: "$3 \\times 5$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "array",
              rows: 3,
              cols: 4,
            },
          },
          {
            id: "o2",
            content: {
              kind: "array",
              rows: 4,
              cols: 5,
            },
          },
          {
            id: "o3",
            content: {
              kind: "array",
              rows: 3,
              cols: 5,
            },
          },
        ],
        select: "one",
        layout: "grid",
      },
      key: {
        correct: ["o3"],
        near: {
          o1: "one_column_short",
          o2: "one_row_extra",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij 4 rzędów po 6",
          en: "Tap 4 rows of 6",
        },
        value: {
          chosen: ["o2"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij 4 rzędów po 5 (o jedną kolumnę za mało)",
          en: "Tap 4 rows of 5 (one column short)",
        },
        value: {
          chosen: ["o3"],
        },
        outcome: "incorrect",
        mistake_class: "one_column_short",
        marks: [
          {
            id: "o3",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij 3 rzędów po 8 (tyle samo kropek, inne rzędy)",
          en: "Tap 3 rows of 8 (as many dots, other rows)",
        },
        value: {
          chosen: ["o1"],
        },
        outcome: "incorrect",
        mistake_class: "same_total_other_fact",
        marks: [
          {
            id: "o1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij 5 rzędów po 6 (o jeden rząd za dużo)",
          en: "Tap 5 rows of 6 (one row too many)",
        },
        value: {
          chosen: ["o4"],
        },
        outcome: "incorrect",
        mistake_class: "one_row_extra",
        marks: [
          {
            id: "o4",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "stickers-contest",
    label:
      "A two-step word problem, contest style: five lettered answers, a picture, a Check button",
    showcase: true,
    question: {
      question_type: "lettered_choice",
      family: "choose",
      say: {
        pl: "Kasia ma cztery paczki naklejek, po sześć naklejek w każdej. Pięć naklejek dała bratu. Ile naklejek jej zostało? Wybierz jedną z liczb: 24, 29, 19, 15 albo 1.",
        en: "Kasia has four packs of stickers, six stickers in each. She gave five stickers to her brother. How many stickers does she have left? Pick one of the numbers: 24, 29, 19, 15 or 1.",
      },
      data: {
        stem: {
          text: {
            pl: "Kasia ma 4 paczki naklejek, po 6 naklejek w każdej. 5 naklejek dała bratu. Ile naklejek jej zostało?",
            en: "Kasia has 4 packs of stickers, 6 stickers in each. She gave 5 stickers to her brother. How many stickers does she have left?",
          },
          text_replaces_say: true,
          figure: {
            kind: "groups",
            groups: 4,
            each: 6,
            icon: "star",
            alt: {
              pl: "Paczki naklejek z gwiazdkami",
              en: "Packs of star stickers",
            },
          },
        },
        options: [
          {
            id: "A",
            letter: "A",
            content: {
              kind: "number",
              number: 24,
            },
          },
          {
            id: "B",
            letter: "B",
            content: {
              kind: "number",
              number: 29,
            },
          },
          {
            id: "C",
            letter: "C",
            content: {
              kind: "number",
              number: 19,
            },
          },
          {
            id: "D",
            letter: "D",
            content: {
              kind: "number",
              number: 15,
            },
          },
          {
            id: "E",
            letter: "E",
            content: {
              kind: "number",
              number: 1,
            },
          },
        ],
        select: "one",
        layout: "lettered",
      },
      key: {
        correct: ["C"],
        near: {
          A: "forgot_second_step",
          B: "added_not_subtracted",
          D: "added_not_multiplied",
          E: "one_pack_only",
        },
      },
      help: {
        look: {
          text: {
            pl: "To zadanie ma dwa kroki. Najpierw policz wszystkie naklejki, potem pomyśl o bracie.",
            en: "This problem has two steps. First count all the stickers, then think about the brother.",
          },
        },
        boost: {
          text: {
            pl: "Dwie odpowiedzi są już skreślone. 4 paczki po 6 to 4 × 6 = 24 naklejki. Ile zostanie, gdy 5 odda bratu?",
            en: "Two answers are crossed out for you. 4 packs of 6 is 4 × 6 = 24 stickers. How many are left after 5 go to her brother?",
          },
        },
        give: ["D", "E"],
        boost_by_mistake: {
          forgot_second_step: {
            text: {
              pl: "Tyle naklejek Kasia miała na początku. Pamiętaj o drugim kroku: 5 dała bratu.",
              en: "That is how many Kasia had at the start. Remember the second step: she gave 5 to her brother.",
            },
          },
          added_not_subtracted: {
            text: {
              pl: "Kasia dała naklejki, więc ma ich teraz mniej, nie więcej.",
              en: "Kasia gave stickers away, so now she has fewer, not more.",
            },
          },
          added_not_multiplied: {
            text: {
              pl: "Paczek nie dodajemy do naklejek. Każda z 4 paczek ma 6 naklejek: to mnożenie.",
              en: "We do not add the packs to the stickers. Each of the 4 packs holds 6 stickers: that is a multiplication.",
            },
          },
        },
        worked: [
          "4 × 6 = 24",
          "24 − 5 = 19",
          {
            pl: "Kasi zostało 19 naklejek.",
            en: "Kasia has 19 stickers left.",
          },
        ],
        almost: ["4 × 6 = 24", "24 − 5 = □"],
      },
    },
    twin: {
      question_type: "lettered_choice",
      family: "choose",
      say: {
        pl: "Tomek ma trzy pudełka kulek, po pięć kulek w każdym. Cztery kulki zgubił. Ile kulek mu zostało? Wybierz jedną z liczb: 15, 19, 1, 11 albo 12.",
        en: "Tomek has three boxes of marbles, five marbles in each. He lost four marbles. How many marbles does he have left? Pick one of the numbers: 15, 19, 1, 11 or 12.",
      },
      data: {
        stem: {
          text: {
            pl: "Tomek ma 3 pudełka kulek, po 5 kulek w każdym. 4 kulki zgubił. Ile kulek mu zostało?",
            en: "Tomek has 3 boxes of marbles, 5 marbles in each. He lost 4 marbles. How many marbles does he have left?",
          },
          text_replaces_say: true,
        },
        options: [
          {
            id: "A",
            letter: "A",
            content: {
              kind: "number",
              number: 15,
            },
          },
          {
            id: "B",
            letter: "B",
            content: {
              kind: "number",
              number: 19,
            },
          },
          {
            id: "C",
            letter: "C",
            content: {
              kind: "number",
              number: 1,
            },
          },
          {
            id: "D",
            letter: "D",
            content: {
              kind: "number",
              number: 11,
            },
          },
          {
            id: "E",
            letter: "E",
            content: {
              kind: "number",
              number: 12,
            },
          },
        ],
        select: "one",
        layout: "lettered",
      },
      key: {
        correct: ["D"],
        near: {
          A: "forgot_second_step",
          B: "added_not_subtracted",
          C: "one_pack_only",
          E: "added_not_multiplied",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wybierz 19, potem {check}",
          en: "Choose 19, then {check}",
        },
        value: {
          chosen: ["C"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wybierz 24 (policzone naklejki, ale bez odjęcia tych dla brata)",
          en: "Choose 24 (the stickers counted, but the brother’s not taken away)",
        },
        value: {
          chosen: ["A"],
        },
        outcome: "incorrect",
        mistake_class: "forgot_second_step",
        marks: [
          {
            id: "A",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wybierz 29 (dodane zamiast odjętych)",
          en: "Choose 29 (added instead of taken away)",
        },
        value: {
          chosen: ["B"],
        },
        outcome: "incorrect",
        mistake_class: "added_not_subtracted",
        marks: [
          {
            id: "B",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wybierz 15 (4 + 6 + 5)",
          en: "Choose 15 (4 + 6 + 5)",
        },
        value: {
          chosen: ["D"],
        },
        outcome: "incorrect",
        mistake_class: "added_not_multiplied",
        marks: [
          {
            id: "D",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "arrays-for-a-fact",
    label:
      "Pick all that apply: arrays as options, the turned one counts too, a same-total array does not",
    showcase: true,
    question: {
      question_type: "multi_select",
      family: "choose",
      say: {
        pl: "Zaznacz wszystkie prostokąty z kropek, które pokazują trzy razy cztery.",
        en: "Pick every dot rectangle that shows three times four.",
      },
      data: {
        stem: {
          text: "$3 \\times 4$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "array",
              rows: 3,
              cols: 4,
            },
          },
          {
            id: "o2",
            content: {
              kind: "array",
              rows: 3,
              cols: 5,
            },
          },
          {
            id: "o3",
            content: {
              kind: "array",
              rows: 4,
              cols: 3,
            },
          },
          {
            id: "o4",
            content: {
              kind: "array",
              rows: 2,
              cols: 6,
            },
          },
        ],
        select: "many",
        layout: "grid",
      },
      key: {
        correct: ["o1", "o3"],
        near: {
          o2: "one_column_extra",
          o4: "same_total_other_fact",
        },
      },
      help: {
        look: {
          text: {
            pl: "Przy każdym prostokącie policz rzędy i kropki w jednym rzędzie.",
            en: "For each rectangle, count the rows and the dots in one row.",
          },
          focus: ["o1", "o2", "o3", "o4"],
        },
        boost: {
          text: {
            pl: "3 × 4 to 3 rzędy po 4 kropki. Prostokąt obrócony bokiem też się liczy: wtedy rzędy i kolumny zamieniają się miejscami.",
            en: "3 × 4 is 3 rows of 4 dots. A rectangle turned on its side counts too: its rows and columns swap places.",
          },
        },
        boost_by_mistake: {
          missed_option: {
            text: {
              pl: "Jeden prostokąt jest obrócony. Obróć go w głowie: czy wtedy pasuje?",
              en: "One rectangle is turned. Turn it back in your head: does it fit then?",
            },
          },
          same_total_other_fact: {
            text: {
              pl: "Ten prostokąt ma tyle samo kropek, ale inne rzędy. Liczy się kształt, nie tylko liczba kropek.",
              en: "That rectangle has as many dots, but in other rows. The shape counts, not only the number of dots.",
            },
          },
          one_column_extra: {
            text: {
              pl: "Policz kropki w jednym rzędzie jeszcze raz.",
              en: "Count the dots in one row once more.",
            },
          },
        },
        worked: [
          {
            pl: "3 rzędy po 4: to 3 × 4",
            en: "3 rows of 4: that is 3 × 4",
          },
          {
            pl: "4 rzędy po 3: to samo, obrócone",
            en: "4 rows of 3: the same, turned",
          },
          {
            pl: "3 rzędy po 5 i 2 rzędy po 6 to inne mnożenia",
            en: "3 rows of 5 and 2 rows of 6 are other multiplications",
          },
        ],
      },
    },
    twin: {
      question_type: "multi_select",
      family: "choose",
      say: {
        pl: "Zaznacz wszystkie prostokąty z kropek, które pokazują dwa razy pięć.",
        en: "Pick every dot rectangle that shows two times five.",
      },
      data: {
        stem: {
          text: "$2 \\times 5$",
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "array",
              rows: 5,
              cols: 2,
            },
          },
          {
            id: "o2",
            content: {
              kind: "array",
              rows: 2,
              cols: 4,
            },
          },
          {
            id: "o3",
            content: {
              kind: "array",
              rows: 2,
              cols: 5,
            },
          },
          {
            id: "o4",
            content: {
              kind: "array",
              rows: 1,
              cols: 10,
            },
          },
        ],
        select: "many",
        layout: "grid",
      },
      key: {
        correct: ["o1", "o3"],
        near: {
          o2: "one_column_short",
          o4: "same_total_other_fact",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zaznacz 3 rzędy po 4 i 4 rzędy po 3, potem {check}",
          en: "Pick 3 rows of 4 and 4 rows of 3, then {check}",
        },
        value: {
          chosen: ["o1", "o3"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zaznacz też 3 rzędy po 5 (o jedną kolumnę za dużo)",
          en: "Also pick 3 rows of 5 (one column too many)",
        },
        value: {
          chosen: ["o1", "o2", "o3"],
        },
        outcome: "incorrect",
        mistake_class: "one_column_extra",
        marks: [
          {
            id: "o2",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Zaznacz tylko 3 rzędy po 4 (obrócony pominięty)",
          en: "Pick only 3 rows of 4 (the turned one missed)",
        },
        value: {
          chosen: ["o1"],
        },
        outcome: "incorrect",
        mistake_class: "missed_option",
        marks: [],
      },
      {
        try: {
          pl: "Zaznacz też 2 rzędy po 6 (tyle samo kropek, inne mnożenie)",
          en: "Also pick 2 rows of 6 (as many dots, another multiplication)",
        },
        value: {
          chosen: ["o1", "o3", "o4"],
        },
        outcome: "incorrect",
        mistake_class: "same_total_other_fact",
        marks: [
          {
            id: "o4",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "even-numbers",
    label: "Every even number, two of four",
    question: {
      question_type: "multi_select",
      family: "choose",
      say: {
        pl: "Zaznacz wszystkie liczby parzyste.",
        en: "Pick every even number.",
      },
      data: {
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 12,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 7,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 18,
            },
          },
          {
            id: "o4",
            content: {
              kind: "number",
              number: 25,
            },
          },
        ],
        select: "many",
        layout: "grid",
      },
      key: {
        correct: ["o1", "o3"],
        near: {
          o2: "odd_as_even",
          o4: "odd_as_even",
        },
      },
      help: {
        look: {
          text: {
            pl: "Spójrz na ostatnią cyfrę każdej liczby.",
            en: "Look at the last digit of each number.",
          },
          focus: ["o1", "o2", "o3", "o4"],
        },
        boost: {
          text: {
            pl: "Liczby parzyste kończą się na 0, 2, 4, 6 albo 8. Dzielą się na dwa równe rzędy.",
            en: "Even numbers end in 0, 2, 4, 6 or 8. They split into two equal rows.",
          },
          picture: {
            kind: "dots",
            rows: 2,
            cols: 5,
            alt: {
              pl: "Dziesięć kropek w dwóch równych rzędach",
              en: "Ten dots in two equal rows",
            },
          },
        },
        boost_by_mistake: {
          odd_as_even: {
            text: {
              pl: "Jedna z wybranych liczb kończy się cyfrą nieparzystą. Spróbuj podzielić ją na dwa równe rzędy.",
              en: "One you picked ends in an odd digit. Try splitting it into two equal rows.",
            },
          },
          missed_option: {
            text: {
              pl: "Sprawdź każdą kartę po kolei, nie tylko pierwszą.",
              en: "Check every card in turn, not only the first one.",
            },
          },
        },
        worked: [
          {
            pl: "7 kończy się na 7: nieparzysta",
            en: "7 ends in 7: odd",
          },
          {
            pl: "25 kończy się na 5: nieparzysta",
            en: "25 ends in 5: odd",
          },
          {
            pl: "12 kończy się na 2: parzysta",
            en: "12 ends in 2: even",
          },
          {
            pl: "18 kończy się na 8: parzysta",
            en: "18 ends in 8: even",
          },
        ],
      },
    },
    twin: {
      question_type: "multi_select",
      family: "choose",
      say: {
        pl: "Zaznacz wszystkie liczby parzyste.",
        en: "Pick every even number.",
      },
      data: {
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 14,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 21,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 30,
            },
          },
          {
            id: "o4",
            content: {
              kind: "number",
              number: 9,
            },
          },
        ],
        select: "many",
        layout: "grid",
      },
      key: {
        correct: ["o1", "o3"],
        near: {
          o2: "odd_as_even",
          o4: "odd_as_even",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zaznacz 12 i 18, potem {check}",
          en: "Pick 12 and 18, then {check}",
        },
        value: {
          chosen: ["o1", "o3"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zaznacz 12 i 7",
          en: "Pick 12 and 7",
        },
        value: {
          chosen: ["o1", "o2"],
        },
        outcome: "incorrect",
        mistake_class: "odd_as_even",
        marks: [
          {
            id: "o2",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Zaznacz tylko 12",
          en: "Pick only 12",
        },
        value: {
          chosen: ["o1"],
        },
        outcome: "incorrect",
        mistake_class: "missed_option",
        marks: [],
      },
    ],
  },
  {
    id: "stickers",
    label: "A word problem with a number it does not need (the age)",
    showcase: true,
    question: {
      question_type: "mark_numbers",
      family: "choose",
      say: {
        pl: "Dotknij liczb, których potrzebujesz, żeby odpowiedzieć na pytanie.",
        en: "Tap the numbers you need to answer the question.",
      },
      data: {
        stem: {
          text: {
            pl: "Kasia ma {o1} lat. Kupiła {o2} paczki po {o3} naklejek. Ile naklejek kupiła Kasia?",
            en: "Kasia is {o1} years old. She bought {o2} packs of {o3} stickers. How many stickers did Kasia buy?",
          },
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 8,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 3,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 6,
            },
          },
        ],
        select: "many",
        layout: "inline",
      },
      key: {
        correct: ["o2", "o3"],
        near: {
          o1: "took_unneeded_number",
        },
      },
      help: {
        look: {
          text: {
            pl: "Przeczytaj pytanie na końcu. O co pyta: o naklejki czy o Kasię?",
            en: "Read the question at the end. What does it ask about: the stickers or Kasia?",
          },
        },
        boost: {
          text: {
            pl: "Żeby policzyć naklejki, trzeba wiedzieć dwie rzeczy: ile jest paczek i ile naklejek jest w jednej paczce.",
            en: "To count the stickers you need two things: how many packs there are, and how many stickers are in one pack.",
          },
        },
        boost_by_mistake: {
          took_unneeded_number: {
            text: {
              pl: "Wiek Kasi nic nie mówi o naklejkach. Której liczby pytanie nie potrzebuje?",
              en: "Kasia’s age says nothing about the stickers. Which number does the question not need?",
            },
          },
          missed_needed_number: {
            text: {
              pl: "Pytanie potrzebuje dwóch liczb. Sprawdź jeszcze raz: ile paczek i ile naklejek w paczce?",
              en: "The question needs two numbers. Check again: how many packs, and how many stickers in a pack?",
            },
          },
        },
        worked: [
          {
            pl: "Pytanie: ile naklejek kupiła Kasia?",
            en: "The question: how many stickers did Kasia buy?",
          },
          {
            pl: "8 lat to wiek Kasi, nie liczba naklejek",
            en: "8 years is Kasia’s age, not a number of stickers",
          },
          {
            pl: "Potrzebne są 3 paczki i 6 naklejek w każdej",
            en: "We need 3 packs and 6 stickers in each",
          },
          {
            pl: "Zaznaczamy 3 i 6",
            en: "We mark 3 and 6",
          },
        ],
      },
    },
    twin: {
      question_type: "mark_numbers",
      family: "choose",
      say: {
        pl: "Dotknij liczb, których potrzebujesz, żeby odpowiedzieć na pytanie.",
        en: "Tap the numbers you need to answer the question.",
      },
      data: {
        stem: {
          text: {
            pl: "Kasia ma {o1} lat. Na urodziny dostała {o2} pudełka po {o3} kredek. Ile kredek dostała Kasia?",
            en: "Kasia is {o1} years old. For her birthday she got {o2} boxes of {o3} crayons. How many crayons did Kasia get?",
          },
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "number",
              number: 9,
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 2,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 12,
            },
          },
        ],
        select: "many",
        layout: "inline",
      },
      key: {
        correct: ["o2", "o3"],
        near: {
          o1: "took_unneeded_number",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij 3 i 6, potem {check}",
          en: "Tap 3 and 6, then {check}",
        },
        value: {
          chosen: ["o2", "o3"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij wszystkich trzech liczb (wiek też)",
          en: "Tap all three numbers (the age too)",
        },
        value: {
          chosen: ["o1", "o2", "o3"],
        },
        outcome: "incorrect",
        mistake_class: "took_unneeded_number",
        marks: [
          {
            id: "o1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij tylko 3",
          en: "Tap only 3",
        },
        value: {
          chosen: ["o2"],
        },
        outcome: "incorrect",
        mistake_class: "missed_needed_number",
        marks: [],
      },
      {
        try: {
          pl: "Dotknij tylko 8",
          en: "Tap only 8",
        },
        value: {
          chosen: ["o1"],
        },
        outcome: "incorrect",
        mistake_class: "took_unneeded_number",
        marks: [
          {
            id: "o1",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "books-word-number",
    label: "One number written as a word, and one the question does not need",
    question: {
      question_type: "mark_numbers",
      family: "choose",
      say: {
        pl: "Dotknij liczb, których potrzebujesz. Jedna jest zapisana słowem.",
        en: "Tap the numbers you need. One is written as a word.",
      },
      data: {
        stem: {
          text: {
            pl: "Na półce stały {o1} książki. Tomek dołożył jeszcze {o2}. Każda książka ma {o3} stron. Ile książek stoi teraz na półce?",
            en: "There were {o1} books on the shelf. Tom put {o2} more on it. Each book has {o3} pages. How many books are on the shelf now?",
          },
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "text",
              text: {
                pl: "cztery",
                en: "four",
              },
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 5,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 120,
            },
          },
        ],
        select: "many",
        layout: "inline",
      },
      key: {
        correct: ["o1", "o2"],
        near: {
          o3: "took_unneeded_number",
        },
      },
      help: {
        look: {
          text: {
            pl: "Liczba może być zapisana słowem, literami. Szukaj też takich liczb.",
            en: "A number can be written as a word, in letters. Look for those too.",
          },
        },
        boost: {
          text: {
            pl: "Pytanie jest o książki na półce. Które liczby mówią, ile książek było i ile przybyło?",
            en: "The question is about the books on the shelf. Which numbers say how many books there were and how many came?",
          },
        },
        boost_by_mistake: {
          missed_needed_number: {
            text: {
              pl: "Jedna liczba jest napisana słowem, nie cyframi. Przeczytaj pierwsze zdanie jeszcze raz.",
              en: "One number is written as a word, not in digits. Read the first sentence again.",
            },
          },
          took_unneeded_number: {
            text: {
              pl: "Liczba stron mówi, jak gruba jest książka, a nie ile jest książek.",
              en: "The number of pages says how thick a book is, not how many books there are.",
            },
          },
        },
        worked: [
          {
            pl: "Pytanie: ile książek stoi teraz na półce?",
            en: "The question: how many books are on the shelf now?",
          },
          {
            pl: "Było cztery, Tomek dołożył 5",
            en: "There were four, Tom put 5 more",
          },
          {
            pl: "Liczba stron nie jest potrzebna",
            en: "The number of pages is not needed",
          },
          {
            pl: "Zaznaczamy cztery i 5",
            en: "We mark four and 5",
          },
        ],
      },
    },
    twin: {
      question_type: "mark_numbers",
      family: "choose",
      say: {
        pl: "Dotknij liczb, których potrzebujesz. Jedna jest zapisana słowem.",
        en: "Tap the numbers you need. One is written as a word.",
      },
      data: {
        stem: {
          text: {
            pl: "W klasie jest {o1} dziewczynek i {o2} chłopców. Ich sala ma numer {o3}. Ilu uczniów jest w klasie?",
            en: "There are {o1} girls and {o2} boys in the class. Their classroom is number {o3}. How many pupils are in the class?",
          },
        },
        options: [
          {
            id: "o1",
            content: {
              kind: "text",
              text: {
                pl: "dwanaście",
                en: "twelve",
              },
            },
          },
          {
            id: "o2",
            content: {
              kind: "number",
              number: 11,
            },
          },
          {
            id: "o3",
            content: {
              kind: "number",
              number: 14,
            },
          },
        ],
        select: "many",
        layout: "inline",
      },
      key: {
        correct: ["o1", "o2"],
        near: {
          o3: "took_unneeded_number",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij cztery i 5, potem {check}",
          en: "Tap four and 5, then {check}",
        },
        value: {
          chosen: ["o1", "o2"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij tylko 5 (liczba słowem pominięta)",
          en: "Tap only 5 (the number in words missed)",
        },
        value: {
          chosen: ["o2"],
        },
        outcome: "incorrect",
        mistake_class: "missed_needed_number",
        marks: [],
      },
      {
        try: {
          pl: "Dotknij cztery, 5 i 120 (strony też)",
          en: "Tap four, 5 and 120 (the pages too)",
        },
        value: {
          chosen: ["o1", "o2", "o3"],
        },
        outcome: "incorrect",
        mistake_class: "took_unneeded_number",
        marks: [
          {
            id: "o3",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij tylko 120",
          en: "Tap only 120",
        },
        value: {
          chosen: ["o3"],
        },
        outcome: "incorrect",
        mistake_class: "took_unneeded_number",
        marks: [
          {
            id: "o3",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "compare-quarters-thirds",
    label: "Compare three quarters and two thirds on two bars of one length",
    showcase: true,
    question: {
      question_type: "fraction_compare",
      family: "choose",
      say: {
        pl: "Popatrz na paski. Która część jest większa? Wybierz znak.",
        en: "Look at the bars. Which part is bigger? Pick the sign.",
      },
      data: {
        stem: {
          figure: {
            kind: "fraction_bars",
            items: [
              {
                n: 3,
                d: 4,
              },
              {
                n: 2,
                d: 3,
              },
            ],
            shape: "bar",
            alt: {
              pl: "Dwa paski tej samej długości. Pierwszy ma 4 równe części, 3 zamalowane. Drugi ma 3 równe części, 2 zamalowane.",
              en: "Two bars of the same length. The first has 4 equal parts, 3 shaded. The second has 3 equal parts, 2 shaded.",
            },
          },
        },
        line: "$\\frac{3}{4}$ {pick} $\\frac{2}{3}$",
        options: [
          {
            id: "c1",
            content: {
              kind: "text",
              text: "<",
            },
          },
          {
            id: "c2",
            content: {
              kind: "text",
              text: "=",
            },
          },
          {
            id: "c3",
            content: {
              kind: "text",
              text: ">",
            },
          },
        ],
        select: "one",
        layout: "grid",
      },
      key: {
        correct: ["c3"],
        near: {
          c2: "same_parts_missing",
          c1: "smaller_pieces_only",
        },
      },
      help: {
        look: {
          text: {
            pl: "Oba paski mają tę samą długość: to ta sama całość.",
            en: "Both bars are the same length: the same whole.",
          },
        },
        boost: {
          text: {
            pl: "Porównaj, gdzie kończy się zamalowana część na każdym pasku. Która zamalowana część sięga dalej?",
            en: "Compare where the shading ends on each bar. Which shaded part reaches further?",
          },
        },
        boost_by_mistake: {
          same_parts_missing: {
            text: {
              pl: "W obu brakuje jednej części, ale te części są różnej wielkości. Która brakująca część jest mniejsza?",
              en: "Each is one part short, but the parts are not the same size. Which missing part is smaller?",
            },
          },
          smaller_pieces_only: {
            text: {
              pl: "Czwarte są mniejsze, ale są ich trzy, a trzecich tylko dwie. Popatrz na długość zamalowania.",
              en: "Quarters are smaller, but there are three of them and only two thirds. Look at how long the shading is.",
            },
          },
        },
        almost: [
          {
            pl: "Zamalowanie na pierwszym pasku sięga dalej.",
            en: "The shading on the first bar reaches further.",
          },
          {
            pl: "$\\frac{3}{4}$ □ $\\frac{2}{3}$",
            en: "$\\frac{3}{4}$ □ $\\frac{2}{3}$",
          },
        ],
        worked: [
          {
            pl: "Paski mają tę samą długość, więc porównujemy części tej samej całości.",
            en: "The bars are the same length, so we compare parts of the same whole.",
          },
          {
            pl: "Trzy czwarte sięgają dalej niż dwie trzecie.",
            en: "Three quarters reaches further than two thirds.",
          },
          {
            pl: "$\\frac{3}{4} > \\frac{2}{3}$",
            en: "$\\frac{3}{4} > \\frac{2}{3}$",
          },
        ],
      },
    },
    twin: {
      question_type: "fraction_compare",
      family: "choose",
      say: {
        pl: "Popatrz na paski i wybierz znak.",
        en: "Look at the bars and pick the sign.",
      },
      data: {
        line: "$\\frac{2}{4}$ {pick} $\\frac{2}{3}$",
        options: [
          {
            id: "c1",
            content: {
              kind: "text",
              text: "<",
            },
          },
          {
            id: "c2",
            content: {
              kind: "text",
              text: "=",
            },
          },
          {
            id: "c3",
            content: {
              kind: "text",
              text: ">",
            },
          },
        ],
        select: "one",
        layout: "grid",
        stem: {
          figure: {
            kind: "fraction_bars",
            items: [
              {
                n: 2,
                d: 4,
              },
              {
                n: 2,
                d: 3,
              },
            ],
            shape: "bar",
            alt: {
              pl: "Dwa paski tej samej długości. Pierwszy ma 4 równe części, 2 zamalowane. Drugi ma 3 równe części, 2 zamalowane.",
              en: "Two bars of the same length. The first has 4 equal parts, 2 shaded. The second has 3 equal parts, 2 shaded.",
            },
          },
        },
      },
      key: {
        correct: ["c1"],
        near: {
          c2: "compared_numerators_only",
          c3: "bigger_denominator_bigger",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wybierz >, potem {check}",
          en: "Pick >, then {check}",
        },
        value: {
          chosen: ["c3"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wybierz = (w obu brakuje jednej części)",
          en: "Pick = (each is one part short of whole)",
        },
        value: {
          chosen: ["c2"],
        },
        outcome: "incorrect",
        mistake_class: "same_parts_missing",
        marks: [
          {
            id: "c2",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wybierz < (czwarte są mniejsze niż trzecie)",
          en: "Pick < (quarters are smaller than thirds)",
        },
        value: {
          chosen: ["c1"],
        },
        outcome: "incorrect",
        mistake_class: "smaller_pieces_only",
        marks: [
          {
            id: "c1",
            correct: false,
          },
        ],
      },
    ],
  },
];
