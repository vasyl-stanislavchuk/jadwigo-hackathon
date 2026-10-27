// The enter family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const ENTER_EXAMPLES: WrittenExample[] = [
  {
    id: "seven-eights",
    label: "Recall 7 × 8 with no options, by keypad or voice: the strongest evidence for a fact",
    showcase: true,
    question: {
      question_type: "production",
      family: "enter",
      say: {
        pl: "Ile to jest siedem razy osiem? Napisz odpowiedź.",
        en: "What is seven times eight? Type the answer.",
      },
      data: {
        input: "number",
        entry: "keypad",
        voice: true,
        figure: {
          kind: "expression",
          text: "7 × 8 = ?",
        },
      },
      key: {
        accept: ["56"],
        near: {
          "15": "add_for_multiply",
          "48": "neighbour_row",
          "63": "neighbour_row",
          "65": "digit_reversal",
        },
        rule: {
          rule: "times_table",
          a: 7,
          b: 8,
          recent: [],
        },
      },
      help: {
        look: {
          text: {
            pl: "Pomyśl o faktach, które już znasz: siedem razy cztery.",
            en: "Think of a fact you already know: seven times four.",
          },
        },
        boost: {
          text: {
            pl: "7 × 8 to dwa razy 7 × 4. 7 × 4 = 28. Podwój to.",
            en: "7 × 8 is 7 × 4 twice. 7 × 4 = 28. Double it.",
          },
          picture: {
            kind: "dots",
            rows: 7,
            cols: 8,
            alt: {
              pl: "Siedem rzędów po osiem kropek",
              en: "Seven rows of eight dots",
            },
          },
        },
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "To wynik z rzędu obok. Siedem ósemek, ani jednej więcej, ani mniej.",
              en: "That is the row next door. Seven eights, not one more or one fewer.",
            },
          },
          add_for_multiply: {
            text: {
              pl: "7 + 8 to dodawanie. Mnożenie to siedem ósemek razem.",
              en: "7 + 8 is adding. Multiplying is seven eights together.",
            },
          },
          digit_reversal: {
            text: {
              pl: "Cyfry stoją odwrotnie. Najpierw dziesiątki, potem jedności.",
              en: "The digits are the other way round. Tens first, then ones.",
            },
          },
        },
        worked: ["7 × 4 = 28", "28 + 28 = 56", "7 × 8 = 56"],
        almost: ["7 × 4 = 28", "28 + 28 = □"],
      },
    },
    twin: {
      question_type: "production",
      family: "enter",
      say: {
        pl: "Ile to jest sześć razy osiem? Napisz odpowiedź.",
        en: "What is six times eight? Type the answer.",
      },
      data: {
        input: "number",
        entry: "keypad",
        voice: true,
        figure: {
          kind: "expression",
          text: "6 × 8 = ?",
        },
      },
      key: {
        accept: ["48"],
        near: {
          "14": "add_for_multiply",
          "42": "neighbour_row",
          "56": "neighbour_row",
          "84": "digit_reversal",
        },
        rule: {
          rule: "times_table",
          a: 6,
          b: 8,
          recent: [],
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 56",
          en: "Type 56",
        },
        value: {
          entered: "56",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 63 (to 7 × 9, rząd obok)",
          en: "Type 63 (that is 7 × 9, the row next door)",
        },
        value: {
          entered: "63",
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 15 (dodane zamiast pomnożonych)",
          en: "Type 15 (added, not multiplied)",
        },
        value: {
          entered: "15",
        },
        outcome: "incorrect",
        mistake_class: "add_for_multiply",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 65 (cyfry zamienione)",
          en: "Type 65 (the digits swapped)",
        },
        value: {
          entered: "65",
        },
        outcome: "incorrect",
        mistake_class: "digit_reversal",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 30",
          en: "Type 30",
        },
        value: {
          entered: "30",
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "read-tens",
    label: "Read a whole number off a line counted in tens, labelled only at 0, 50 and 100",
    showcase: true,
    question: {
      question_type: "production",
      family: "enter",
      say: {
        pl: "Jaką liczbę pokazuje znacznik na osi liczbowej?",
        en: "What number does the marker show on the number line?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "number_line",
          min: 0,
          max: 100,
          step: 10,
          labelled: [0, 50, 100],
          marker: 70,
        },
      },
      key: {
        accept: ["70"],
        near: {
          "7": "scale_misread",
          "30": "wrong_direction",
          "60": "off_by_tick",
          "80": "off_by_tick",
        },
      },
      help: {
        look: {
          text: {
            pl: "Od 0 do 50 jest pięć równych skoków. Ile jest wart jeden skok?",
            en: "From 0 to 50 there are five equal jumps. How much is one jump worth?",
          },
        },
        boost: {
          text: {
            pl: "Każda kreska to 10. Zacznij od 50 i licz dziesiątkami do znacznika.",
            en: "Each tick is 10. Start at 50 and count in tens up to the marker.",
          },
        },
        boost_by_mistake: {
          scale_misread: {
            text: {
              pl: "Policzone zostały kreski. Ale każda kreska to dziesięć, nie jeden.",
              en: "The ticks got counted. But each tick is ten, not one.",
            },
          },
          wrong_direction: {
            text: {
              pl: "Licz od zera, z lewej strony, nie od setki.",
              en: "Count from zero, on the left, not from 100.",
            },
          },
          off_by_tick: {
            text: {
              pl: "Licz kreski od 50 jeszcze raz, powoli.",
              en: "Count the ticks from 50 once more, slowly.",
            },
          },
        },
        worked: [
          {
            pl: "Od 0 do 50 jest 5 kresek, więc kreska to 10",
            en: "From 0 to 50 there are 5 ticks, so a tick is 10",
          },
          "50, 60, 70",
          {
            pl: "Znacznik pokazuje 70",
            en: "The marker shows 70",
          },
        ],
        almost: [
          {
            pl: "Od 0 do 50 jest 5 kresek, więc kreska to 10",
            en: "From 0 to 50 there are 5 ticks, so a tick is 10",
          },
          "50, 60, □",
        ],
      },
    },
    twin: {
      question_type: "production",
      family: "enter",
      say: {
        pl: "Jaką liczbę pokazuje teraz znacznik?",
        en: "What number does the marker show now?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "number_line",
          min: 0,
          max: 100,
          step: 10,
          labelled: [0, 50, 100],
          marker: 30,
        },
      },
      key: {
        accept: ["30"],
        near: {
          "3": "scale_misread",
          "20": "off_by_tick",
          "40": "off_by_tick",
          "70": "wrong_direction",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 70",
          en: "Type 70",
        },
        value: {
          entered: "70",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 80 (o jedną kreskę za daleko)",
          en: "Type 80 (one tick too far)",
        },
        value: {
          entered: "80",
        },
        outcome: "incorrect",
        mistake_class: "off_by_tick",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 7 (policzone kreski, nie dziesiątki)",
          en: "Type 7 (the ticks counted, not the tens)",
        },
        value: {
          entered: "7",
        },
        outcome: "incorrect",
        mistake_class: "scale_misread",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 30 (liczone od setki)",
          en: "Type 30 (counted back from 100)",
        },
        value: {
          entered: "30",
        },
        outcome: "incorrect",
        mistake_class: "wrong_direction",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 45",
          en: "Type 45",
        },
        value: {
          entered: "45",
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "product-word",
    label: "Name the answer to a multiplication: a maths word a child types",
    showcase: true,
    question: {
      question_type: "short_text",
      family: "enter",
      say: {
        pl: "Jak nazywa się wynik mnożenia? Wpisz to słowo.",
        en: "What is the answer to a multiplication called? Type the word.",
      },
      data: {
        input: "text",
        entry: "keyboard",
        max_length: 20,
        letters: {
          pl: "pl",
          en: "none",
        },
        stem: {
          text: {
            pl: "W działaniu $4 \\cdot 5 = 20$ liczba $20$ to…",
            en: "In $4 \\times 5 = 20$, the number $20$ is the…",
          },
        },
      },
      key: {
        accept: [
          {
            pl: "iloczyn",
            en: "product",
          },
        ],
        case: "ignore",
        near: {
          iloraz: "confuses_quotient",
          suma: "sum_for_product",
          czynnik: "factor_for_product",
          quotient: "confuses_quotient",
          sum: "sum_for_product",
          factor: "factor_for_product",
        },
      },
      help: {
        look: {
          text: {
            pl: "Przypomnij sobie nazwy w mnożeniu: są liczby, które mnożymy, i jest to, co wychodzi.",
            en: "Remember the names in a multiplication: the numbers we multiply, and what comes out.",
          },
        },
        boost: {
          text: {
            pl: "Liczby, które mnożymy, to czynniki. Wynik mnożenia ma swoją nazwę. Zaczyna się na literę „i”.",
            en: "The numbers we multiply are the factors. The answer has its own name. It starts with the letter “p”.",
          },
        },
        boost_by_mistake: {
          confuses_quotient: {
            text: {
              pl: "Iloraz to wynik dzielenia. Tu jest mnożenie. Jak nazywa się jego wynik?",
              en: "A quotient is the answer to a division. Here we multiply. What is its answer called?",
            },
          },
          sum_for_product: {
            text: {
              pl: "Suma to wynik dodawania. Tu jest mnożenie. Jak nazywa się jego wynik?",
              en: "A sum is the answer to an addition. Here we multiply. What is its answer called?",
            },
          },
          factor_for_product: {
            text: {
              pl: "Czynniki to liczby, które mnożymy: 4 i 5. Pytamy o to, co wychodzi.",
              en: "The factors are the numbers we multiply: 4 and 5. We ask about what comes out.",
            },
          },
        },
        worked: [
          {
            pl: "4 i 5 to czynniki",
            en: "4 and 5 are the factors",
          },
          {
            pl: "Wynik mnożenia to iloczyn",
            en: "The answer to a multiplication is the product",
          },
          {
            pl: "20 to iloczyn",
            en: "20 is the product",
          },
        ],
      },
    },
    twin: {
      question_type: "short_text",
      family: "enter",
      say: {
        pl: "Jak nazywa się wynik dodawania? Wpisz to słowo.",
        en: "What is the answer to an addition called? Type the word.",
      },
      data: {
        input: "text",
        entry: "keyboard",
        max_length: 20,
        letters: {
          pl: "pl",
          en: "none",
        },
        stem: {
          text: {
            pl: "W działaniu $7 + 8 = 15$ liczba $15$ to…",
            en: "In $7 + 8 = 15$, the number $15$ is the…",
          },
        },
      },
      key: {
        accept: [
          {
            pl: "suma",
            en: "sum",
          },
        ],
        case: "ignore",
        near: {
          iloczyn: "product_for_sum",
          różnica: "confuses_difference",
          product: "product_for_sum",
          difference: "confuses_difference",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz iloczyn",
          en: "Type product",
        },
        value: {
          entered: {
            pl: "iloczyn",
            en: "product",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz Iloczyn, wielką literą (wielkość liter się nie liczy)",
          en: "Type Product, with a capital (case does not count)",
        },
        value: {
          entered: {
            pl: "Iloczyn",
            en: "Product",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz iloraz (wynik dzielenia)",
          en: "Type quotient (the answer to a division)",
        },
        value: {
          entered: {
            pl: "iloraz",
            en: "quotient",
          },
        },
        outcome: "incorrect",
        mistake_class: "confuses_quotient",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz suma (wynik dodawania)",
          en: "Type sum (the answer to an addition)",
        },
        value: {
          entered: {
            pl: "suma",
            en: "sum",
          },
        },
        outcome: "incorrect",
        mistake_class: "sum_for_product",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz ilocyn (bez jednej litery)",
          en: "Type prodct (one letter dropped)",
        },
        value: {
          entered: {
            pl: "ilocyn",
            en: "prodct",
          },
        },
        outcome: "incorrect",
        mistake_class: "typo",
        marks: [
          {
            id: "l0",
            correct: true,
          },
          {
            id: "l1",
            correct: true,
          },
          {
            id: "l2",
            correct: true,
          },
          {
            id: "l3",
            correct: true,
          },
          {
            id: "l4",
            correct: false,
          },
          {
            id: "l5",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz liczba",
          en: "Type number",
        },
        value: {
          entered: {
            pl: "liczba",
            en: "number",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "number-in-words",
    label: "Write a number in words: a word typed without its accents is named, not lost",
    question: {
      question_type: "short_text",
      family: "enter",
      say: {
        pl: "Zapisz słowami liczbę 47.",
        en: "Write the number 47 in words.",
      },
      data: {
        input: "text",
        entry: "keyboard",
        max_length: 40,
        letters: {
          pl: "pl",
          en: "none",
        },
      },
      key: {
        accept: [
          {
            pl: "czterdzieści siedem",
            en: "forty-seven",
          },
          {
            pl: "czterdzieści siedem",
            en: "forty seven",
          },
        ],
        case: "ignore",
        near: {
          "siedemdziesiąt cztery": "swapped_digits",
          "seventy-four": "swapped_digits",
          "seventy four": "swapped_digits",
          czterdzieści: "tens_only",
          forty: "tens_only",
        },
      },
      help: {
        look: {
          text: {
            pl: "Najpierw dziesiątki, potem jedności. Ile dziesiątek ma ta liczba?",
            en: "Tens first, then ones. How many tens does this number have?",
          },
        },
        boost: {
          text: {
            pl: "Cztery dziesiątki to czterdzieści. Teraz dopisz słowem jedności.",
            en: "Four tens is forty. Now add the ones as a word.",
          },
        },
        boost_by_mistake: {
          missing_diacritics: {
            text: {
              pl: "Sprawdź litery z kreską i ogonkiem: ś, ą, ę.",
              en: "Check the letters with marks on them.",
            },
          },
          swapped_digits: {
            text: {
              pl: "Najpierw cyfra dziesiątek, z lewej. Ile dziesiątek, a ile jedności?",
              en: "The tens digit comes first, on the left. How many tens, and how many ones?",
            },
          },
          tens_only: {
            text: {
              pl: "Dziesiątki są. Dopisz jeszcze jedności.",
              en: "The tens are there. Now add the ones.",
            },
          },
          typo: {
            text: {
              pl: "Przeczytaj powoli, litera po literze.",
              en: "Read it slowly, letter by letter.",
            },
          },
        },
        worked: [
          {
            pl: "47 to 4 dziesiątki i 7 jedności",
            en: "47 is 4 tens and 7 ones",
          },
          {
            pl: "4 dziesiątki to czterdzieści, 7 to siedem",
            en: "4 tens is forty, 7 is seven",
          },
          {
            pl: "47 to czterdzieści siedem",
            en: "47 is forty-seven",
          },
        ],
      },
    },
    twin: {
      question_type: "short_text",
      family: "enter",
      say: {
        pl: "Zapisz słowami liczbę 65.",
        en: "Write the number 65 in words.",
      },
      data: {
        input: "text",
        entry: "keyboard",
        max_length: 40,
        letters: {
          pl: "pl",
          en: "none",
        },
      },
      key: {
        accept: [
          {
            pl: "sześćdziesiąt pięć",
            en: "sixty-five",
          },
          {
            pl: "sześćdziesiąt pięć",
            en: "sixty five",
          },
        ],
        case: "ignore",
        near: {
          "pięćdziesiąt sześć": "swapped_digits",
          "fifty-six": "swapped_digits",
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz czterdzieści siedem",
          en: "Type forty-seven",
        },
        value: {
          entered: {
            pl: "czterdzieści siedem",
            en: "forty-seven",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: "Wpisz czterdziesci siedem, bez kreski nad s (tylko po polsku)",
        value: {
          entered: "czterdziesci siedem",
        },
        outcome: "incorrect",
        mistake_class: "missing_diacritics",
        marks: [
          {
            id: "l0",
            correct: true,
          },
          {
            id: "l1",
            correct: true,
          },
          {
            id: "l2",
            correct: true,
          },
          {
            id: "l3",
            correct: true,
          },
          {
            id: "l4",
            correct: true,
          },
          {
            id: "l5",
            correct: true,
          },
          {
            id: "l6",
            correct: true,
          },
          {
            id: "l7",
            correct: true,
          },
          {
            id: "l8",
            correct: true,
          },
          {
            id: "l9",
            correct: false,
          },
          {
            id: "l10",
            correct: true,
          },
          {
            id: "l11",
            correct: true,
          },
          {
            id: "l12",
            correct: true,
          },
          {
            id: "l13",
            correct: true,
          },
          {
            id: "l14",
            correct: true,
          },
          {
            id: "l15",
            correct: true,
          },
          {
            id: "l16",
            correct: true,
          },
          {
            id: "l17",
            correct: true,
          },
          {
            id: "l18",
            correct: true,
          },
        ],
        only: ["pl"],
      },
      {
        try: {
          pl: "Wpisz siedemdziesiąt cztery (cyfry zamienione)",
          en: "Type seventy-four (the digits swapped)",
        },
        value: {
          entered: {
            pl: "siedemdziesiąt cztery",
            en: "seventy-four",
          },
        },
        outcome: "incorrect",
        mistake_class: "swapped_digits",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz samo czterdzieści",
          en: "Type only forty",
        },
        value: {
          entered: {
            pl: "czterdzieści",
            en: "forty",
          },
        },
        outcome: "incorrect",
        mistake_class: "tens_only",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz czterdzieści siedm (bez jednej litery)",
          en: "Type forty-sevn (one letter dropped)",
        },
        value: {
          entered: {
            pl: "czterdzieści siedm",
            en: "forty-sevn",
          },
        },
        outcome: "incorrect",
        mistake_class: "typo",
        marks: [
          {
            id: "l0",
            correct: true,
          },
          {
            id: "l1",
            correct: true,
          },
          {
            id: "l2",
            correct: true,
          },
          {
            id: "l3",
            correct: true,
          },
          {
            id: "l4",
            correct: true,
          },
          {
            id: "l5",
            correct: true,
          },
          {
            id: "l6",
            correct: true,
          },
          {
            id: "l7",
            correct: true,
          },
          {
            id: "l8",
            correct: true,
          },
          {
            id: "l9",
            correct: true,
          },
          {
            id: "l10",
            correct: true,
          },
          {
            id: "l11",
            correct: true,
          },
          {
            id: "l12",
            correct: true,
          },
          {
            id: "l13",
            correct: true,
          },
          {
            id: "l14",
            correct: true,
          },
          {
            id: "l15",
            correct: true,
          },
          {
            id: "l16",
            correct: true,
          },
          {
            id: "l17",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz trzydzieści siedem",
          en: "Type thirty-seven",
        },
        value: {
          entered: {
            pl: "trzydzieści siedem",
            en: "thirty-seven",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "groups-as-product",
    label: "Groups of apples written as a multiplication (concrete)",
    showcase: true,
    question: {
      question_type: "expression",
      family: "enter",
      say: {
        pl: "Zapisz mnożenie, które pokazuje, ile jest razem jabłek.",
        en: "Write a multiplication that shows how many apples there are in all.",
      },
      data: {
        input: "expression",
        entry: "keypad",
        figure: {
          kind: "groups",
          groups: 3,
          each: 4,
          icon: "apple",
          alt: {
            pl: "Trzy grupy po cztery jabłka",
            en: "Three groups of four apples",
          },
        },
      },
      key: {
        accept: ["3×4", "4×3"],
        form: "product",
        near: {
          "3+4": "added_not_multiplied",
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz grupy, a potem policz jabłka w jednej grupie.",
            en: "Count the groups, then count the apples in one group.",
          },
        },
        boost: {
          text: {
            pl: "Są 3 grupy. W każdej są 4 jabłka. Mnożenie mówi: tyle grup razy tyle w grupie.",
            en: "There are 3 groups. Each one has 4 apples. A multiplication says: that many groups times that many in a group.",
          },
        },
        boost_by_mistake: {
          sum_for_product: {
            text: {
              pl: "Tu zapisz mnożenie, nie dodawanie. Ile razy dodajesz 4? Napisz tę liczbę, znak × i 4.",
              en: "Here, write a multiplication, not a sum. How many times do you add 4? Write that number, the × sign and 4.",
            },
          },
          added_not_multiplied: {
            text: {
              pl: "Grup nie dodajemy do jabłek. W każdej z 3 grup są 4 jabłka: ile razy bierzesz po 4?",
              en: "We do not add the groups to the apples. Each of the 3 groups has 4 apples: how many times do you take 4?",
            },
          },
          number_for_expression: {
            text: {
              pl: "12 to wynik. Tu zapisz samo działanie: liczba grup, znak ×, liczba jabłek w grupie.",
              en: "12 is the result. Here, write the expression itself: the number of groups, the × sign, the apples in a group.",
            },
          },
        },
        worked: [
          {
            pl: "3 grupy",
            en: "3 groups",
          },
          {
            pl: "Po 4 jabłka w każdej",
            en: "4 apples in each one",
          },
          {
            pl: "3 grupy po 4 to 3 × 4",
            en: "3 groups of 4 is 3 × 4",
          },
        ],
      },
    },
    twin: {
      question_type: "expression",
      family: "enter",
      say: {
        pl: "Zapisz mnożenie, które pokazuje, ile jest razem gwiazdek.",
        en: "Write a multiplication that shows how many stars there are in all.",
      },
      data: {
        input: "expression",
        entry: "keypad",
        figure: {
          kind: "groups",
          groups: 2,
          each: 5,
          icon: "star",
          alt: {
            pl: "Dwie grupy po pięć gwiazdek",
            en: "Two groups of five stars",
          },
        },
      },
      key: {
        accept: ["2×5", "5×2"],
        form: "product",
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 3×4",
          en: "Type 3×4",
        },
        value: {
          entered: "3×4",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 4×3 (czynniki zamienione)",
          en: "Type 4×3 (the factors the other way round)",
        },
        value: {
          entered: "4×3",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 4+4+4 (dodawanie zamiast mnożenia)",
          en: "Type 4+4+4 (a sum, not a product)",
        },
        value: {
          entered: "4+4+4",
        },
        outcome: "incorrect",
        mistake_class: "sum_for_product",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 12 (sam wynik)",
          en: "Type 12 (the result alone)",
        },
        value: {
          entered: "12",
        },
        outcome: "incorrect",
        mistake_class: "number_for_expression",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 3+4 (grupy dodane do jabłek)",
          en: "Type 3+4 (the groups added to the apples)",
        },
        value: {
          entered: "3+4",
        },
        outcome: "incorrect",
        mistake_class: "added_not_multiplied",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 3×5 (jabłka policzone inaczej)",
          en: "Type 3×5 (the apples miscounted)",
        },
        value: {
          entered: "3×5",
        },
        outcome: "incorrect",
        mistake_class: "value_off",
        marks: [],
      },
    ],
  },
  {
    id: "sum-as-product",
    label: "A repeated sum written as a multiplication (abstract)",
    question: {
      question_type: "expression",
      family: "enter",
      say: {
        pl: "Zapisz to samo dodawanie jako mnożenie.",
        en: "Write the same sum as a multiplication.",
      },
      data: {
        input: "expression",
        entry: "keypad",
        stem: {
          text: {
            pl: "Kasia zapisała: $2+2+2+2+2+2$",
            en: "Kasia wrote: $2+2+2+2+2+2$",
          },
        },
      },
      key: {
        accept: ["6×2", "2×6"],
        form: "product",
        near: {
          "2×5": "twos_miscounted",
          "5×2": "twos_miscounted",
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz, ile razy w dodawaniu powtarza się dwójka.",
            en: "Count how many times the two repeats in the sum.",
          },
        },
        boost: {
          text: {
            pl: "Dwójka powtarza się 6 razy. Sześć razy dwa zapisujemy znakiem ×.",
            en: "The two repeats 6 times. Six times two is written with the × sign.",
          },
        },
        boost_by_mistake: {
          sum_for_product: {
            text: {
              pl: "To jest dodawanie, które już mamy. Zamień je na mnożenie: ile dwójek razy dwa?",
              en: "That is the sum we already have. Turn it into a multiplication: how many twos times two?",
            },
          },
          twos_miscounted: {
            text: {
              pl: "Policz dwójki jeszcze raz, powoli, palcem po kolei.",
              en: "Count the twos once more, slowly, finger by finger.",
            },
          },
        },
        worked: [
          {
            pl: "W dodawaniu jest 6 dwójek",
            en: "The sum has 6 twos",
          },
          {
            pl: "6 dwójek to 6 × 2",
            en: "6 twos is 6 × 2",
          },
        ],
      },
    },
    twin: {
      question_type: "expression",
      family: "enter",
      say: {
        pl: "Zapisz to samo dodawanie jako mnożenie.",
        en: "Write the same sum as a multiplication.",
      },
      data: {
        input: "expression",
        entry: "keypad",
        stem: {
          text: {
            pl: "Kuba zapisał: $5+5+5+5$",
            en: "Kuba wrote: $5+5+5+5$",
          },
        },
      },
      key: {
        accept: ["4×5", "5×4"],
        form: "product",
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 6×2",
          en: "Type 6×2",
        },
        value: {
          entered: "6×2",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 2×6",
          en: "Type 2×6",
        },
        value: {
          entered: "2×6",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 2+2+2+2+2+2 (przepisane dodawanie)",
          en: "Type 2+2+2+2+2+2 (the sum copied)",
        },
        value: {
          entered: "2+2+2+2+2+2",
        },
        outcome: "incorrect",
        mistake_class: "sum_for_product",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 2×5 (o jedną dwójkę za mało)",
          en: "Type 2×5 (one two short)",
        },
        value: {
          entered: "2×5",
        },
        outcome: "incorrect",
        mistake_class: "twos_miscounted",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 12 (sam wynik)",
          en: "Type 12 (the result alone)",
        },
        value: {
          entered: "12",
        },
        outcome: "incorrect",
        mistake_class: "number_for_expression",
        marks: [],
      },
    ],
  },
  {
    id: "crayon-cm",
    label: "A crayon measured in centimetres, with a start the child must move from",
    showcase: true,
    question: {
      question_type: "measure",
      family: "enter",
      say: {
        pl: "Zmierz kredkę linijką. Ile ma centymetrów?",
        en: "Measure the crayon with the ruler. How many centimetres long is it?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "ruler",
          picture: {
            src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20170%22%20width%3D%22400%22%20height%3D%22170%22%3E%3Crect%20x%3D%2252%22%20y%3D%2238%22%20width%3D%22136%22%20height%3D%2244%22%20rx%3D%226%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%2252%2C44%2040%2C60%2052%2C76%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22188%2C44%20200%2C60%20188%2C76%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%2280%22%20y%3D%2238%22%20width%3D%2280%22%20height%3D%2244%22%20fill%3D%22none%22%20stroke%3D%22darkgreen%22%20stroke-width%3D%223%22%2F%3E%3C%2Fsvg%3E",
            alt: {
              pl: "Zielona kredka świecowa, leżąca poziomo",
              en: "A green wax crayon, lying flat",
            },
            width: 400,
            height: 170,
          },
          unit: "cm",
          length: 8,
          pixels_per_unit: 40,
          start: 120,
        },
      },
      key: {
        accept: ["4"],
        near: {
          "5": "counted_the_marks",
        },
      },
      help: {
        look: {
          text: {
            pl: "Linijka nie stoi przy kredce. Przeciągnij ją, aż zero dotknie lewego końca kredki.",
            en: "The ruler is not at the crayon. Drag it until the zero touches the crayon’s left end.",
          },
        },
        boost: {
          text: {
            pl: "Zero przy lewym końcu. Prawy koniec kredki pokazuje liczbę: to tyle centymetrów.",
            en: "Zero at the left end. The crayon’s right end points at a number: that many centimetres.",
          },
        },
        boost_by_mistake: {
          counted_the_marks: {
            text: {
              pl: "Nie licz kresek z liczbami. Odczytaj liczbę, przy której kończy się kredka.",
              en: "Do not count the numbered marks. Read the number where the crayon ends.",
            },
          },
        },
        worked: [
          {
            pl: "Zero przy lewym końcu kredki",
            en: "Zero at the crayon’s left end",
          },
          {
            pl: "Prawy koniec przy liczbie 4",
            en: "The right end at the number 4",
          },
          {
            pl: "Kredka ma 4 cm",
            en: "The crayon measures 4 cm",
          },
        ],
      },
    },
    twin: {
      question_type: "measure",
      family: "enter",
      say: {
        pl: "Zmierz tę kredkę linijką. Ile ma centymetrów?",
        en: "Measure this crayon with the ruler. How many centimetres long is it?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "ruler",
          picture: {
            src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20170%22%20width%3D%22400%22%20height%3D%22170%22%3E%3Crect%20x%3D%2252%22%20y%3D%2238%22%20width%3D%22176%22%20height%3D%2244%22%20rx%3D%226%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%2252%2C44%2040%2C60%2052%2C76%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Cpolygon%20points%3D%22228%2C44%20240%2C60%20228%2C76%22%20fill%3D%22mediumseagreen%22%20stroke%3D%22gray%22%20stroke-width%3D%222%22%2F%3E%3Crect%20x%3D%2280%22%20y%3D%2238%22%20width%3D%22120%22%20height%3D%2244%22%20fill%3D%22none%22%20stroke%3D%22darkgreen%22%20stroke-width%3D%223%22%2F%3E%3C%2Fsvg%3E",
            alt: {
              pl: "Zielona kredka świecowa, leżąca poziomo",
              en: "A green wax crayon, lying flat",
            },
            width: 400,
            height: 170,
          },
          unit: "cm",
          length: 8,
          pixels_per_unit: 40,
          start: 80,
        },
      },
      key: {
        accept: ["5"],
      },
    },
    scenarios: [
      {
        try: {
          pl: "Przesuń zero do lewego końca kredki i wpisz 4",
          en: "Slide the zero to the left end of the crayon and type 4",
        },
        value: {
          entered: "4",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 5 (policzone kreski z liczbami, razem z zerem)",
          en: "Type 5 (the numbered marks counted, zero included)",
        },
        value: {
          entered: "5",
        },
        outcome: "incorrect",
        mistake_class: "counted_the_marks",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 2 (odczytane od miejsca, gdzie stała linijka)",
          en: "Type 2 (read from where the ruler was left)",
        },
        value: {
          entered: "2",
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "ribbon-mm",
    label: "A ribbon measured in millimetres",
    question: {
      question_type: "measure",
      family: "enter",
      say: {
        pl: "Zmierz wstążkę linijką. Ile ma milimetrów?",
        en: "Measure the ribbon with the ruler. How many millimetres long is it?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "ruler",
          picture: {
            src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20170%22%20width%3D%22400%22%20height%3D%22170%22%3E%3Cpath%20d%3D%22M%2040%2048%20Q%20110%2036%20180%2048%20T%20320%2048%20L%20320%2072%20Q%20250%2084%20180%2072%20T%2040%2072%20Z%22%20fill%3D%22hotpink%22%20stroke%3D%22deeppink%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E",
            alt: {
              pl: "Różowa wstążka, leżąca poziomo",
              en: "A pink ribbon, lying flat",
            },
            width: 400,
            height: 170,
          },
          unit: "mm",
          length: 80,
          pixels_per_unit: 4,
        },
      },
      key: {
        accept: ["70"],
        near: {
          "7": "unit_mixed",
        },
      },
      help: {
        look: {
          text: {
            pl: "Ta linijka pokazuje milimetry: małe kreski. Duże liczby to centymetry, czyli po 10 milimetrów.",
            en: "This ruler shows millimetres: the small marks. The big numbers are centimetres, 10 millimetres each.",
          },
        },
        boost: {
          text: {
            pl: "Zero przy lewym końcu wstążki. Przy prawym końcu stoi liczba 7, czyli 7 centymetrów. Ile to milimetrów?",
            en: "Zero at the ribbon’s left end. Its right end is at the number 7, which is 7 centimetres. How many millimetres is that?",
          },
        },
        boost_by_mistake: {
          unit_mixed: {
            text: {
              pl: "7 to centymetry. Każdy centymetr to 10 milimetrów. Ile to milimetrów?",
              en: "7 is centimetres. Each centimetre is 10 millimetres. How many millimetres is that?",
            },
          },
        },
        worked: [
          {
            pl: "Zero przy lewym końcu wstążki",
            en: "Zero at the ribbon’s left end",
          },
          {
            pl: "Prawy koniec przy liczbie 7, czyli 7 cm",
            en: "The right end at the number 7, which is 7 cm",
          },
          {
            pl: "7 cm to 70 mm",
            en: "7 cm is 70 mm",
          },
        ],
      },
    },
    twin: {
      question_type: "measure",
      family: "enter",
      say: {
        pl: "Zmierz tę wstążkę linijką. Ile ma milimetrów?",
        en: "Measure this ribbon with the ruler. How many millimetres long is it?",
      },
      data: {
        input: "number",
        entry: "keypad",
        figure: {
          kind: "ruler",
          picture: {
            src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20170%22%20width%3D%22400%22%20height%3D%22170%22%3E%3Cpath%20d%3D%22M%2040%2048%20Q%2080%2036%20120%2048%20T%20200%2048%20L%20200%2072%20Q%20160%2084%20120%2072%20T%2040%2072%20Z%22%20fill%3D%22hotpink%22%20stroke%3D%22deeppink%22%20stroke-width%3D%222%22%2F%3E%3C%2Fsvg%3E",
            alt: {
              pl: "Różowa wstążka, leżąca poziomo",
              en: "A pink ribbon, lying flat",
            },
            width: 400,
            height: 170,
          },
          unit: "mm",
          length: 80,
          pixels_per_unit: 4,
        },
      },
      key: {
        accept: ["40"],
      },
    },
    scenarios: [
      {
        try: {
          pl: "Przesuń zero do końca wstążki i wpisz 70",
          en: "Slide the zero to the end of the ribbon and type 70",
        },
        value: {
          entered: "70",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 71 (jedna kreska dalej: w granicy tolerancji)",
          en: "Type 71 (one mark over: within the tolerance)",
        },
        value: {
          entered: "71",
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 7 (centymetry zamiast milimetrów)",
          en: "Type 7 (centimetres instead of millimetres)",
        },
        value: {
          entered: "7",
        },
        outcome: "incorrect",
        mistake_class: "unit_mixed",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 72 (dwie kreski dalej)",
          en: "Type 72 (two marks over)",
        },
        value: {
          entered: "72",
        },
        outcome: "incorrect",
        mistake_class: "off_by_one_unit",
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 50",
          en: "Type 50",
        },
        value: {
          entered: "50",
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
];
