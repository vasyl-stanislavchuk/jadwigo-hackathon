// The sequence family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const SEQUENCE_EXAMPLES: WrittenExample[] = [
  {
    id: "lengths-in-mixed-units",
    label: "Order lengths in metres and centimetres, shortest first: the bare numbers mislead",
    showcase: true,
    question: {
      question_type: "order",
      family: "sequence",
      say: {
        pl: "Ułóż długości od najkrótszej do najdłuższej.",
        en: "Put the lengths in order, shortest first.",
      },
      data: {
        items: [
          {
            id: "i1",
            text: {
              pl: "1 m",
              en: "1 m",
            },
          },
          {
            id: "i2",
            text: {
              pl: "85 cm",
              en: "85 cm",
            },
          },
          {
            id: "i3",
            text: {
              pl: "120 cm",
              en: "120 cm",
            },
          },
          {
            id: "i4",
            text: {
              pl: "2 m",
              en: "2 m",
            },
          },
        ],
        first_label: {
          pl: "najkrótsza",
          en: "shortest",
        },
        last_label: {
          pl: "najdłuższa",
          en: "longest",
        },
      },
      key: {
        orders: [["i2", "i1", "i3", "i4"]],
      },
      help: {
        look: {
          text: {
            pl: "Zanim porównasz, zamień każdą długość na centymetry.",
            en: "Before you compare, turn every length into centimetres.",
          },
          focus: ["i1", "i2", "i3", "i4"],
        },
        boost: {
          text: {
            pl: "1 m to 100 cm. Najkrótsza długość stoi już na górze. Która z reszty jest najkrótsza?",
            en: "1 m is 100 cm. The shortest length is at the top for you. Which of the rest is shortest?",
          },
        },
        give: ["i2"],
        boost_by_mistake: {
          swapped_neighbours: {
            text: {
              pl: "Porównaj 1 m i 85 cm. Ile centymetrów ma metr?",
              en: "Compare 1 m and 85 cm. How many centimetres are in a metre?",
            },
          },
          one_misplaced: {
            text: {
              pl: "Jedna długość stoi nie na swoim miejscu. Zamień ją na centymetry i sprawdź jeszcze raz.",
              en: "One length is out of place. Turn it into centimetres and check again.",
            },
          },
          other_order: {
            text: {
              pl: "Nie porównuj samych liczb. Metr jest dużo dłuższy niż centymetr.",
              en: "Do not compare the bare numbers. A metre is much longer than a centimetre.",
            },
          },
          reversed: {
            text: {
              pl: "Najkrótsza idzie pierwsza, na górze.",
              en: "The shortest goes first, at the top.",
            },
          },
        },
        worked: [
          {
            pl: "1 m = 100 cm, 2 m = 200 cm",
            en: "1 m = 100 cm, 2 m = 200 cm",
          },
          {
            pl: "85 cm < 100 cm < 120 cm < 200 cm",
            en: "85 cm < 100 cm < 120 cm < 200 cm",
          },
          {
            pl: "85 cm, 1 m, 120 cm, 2 m",
            en: "85 cm, 1 m, 120 cm, 2 m",
          },
        ],
        almost: [
          {
            pl: "1 m = 100 cm, 2 m = 200 cm",
            en: "1 m = 100 cm, 2 m = 200 cm",
          },
          {
            pl: "85 cm < □ < 120 cm < 200 cm",
            en: "85 cm < □ < 120 cm < 200 cm",
          },
        ],
      },
    },
    twin: {
      question_type: "order",
      family: "sequence",
      say: {
        pl: "Ułóż długości od najkrótszej do najdłuższej.",
        en: "Put the lengths in order, shortest first.",
      },
      data: {
        items: [
          {
            id: "i1",
            text: {
              pl: "2 m",
              en: "2 m",
            },
          },
          {
            id: "i2",
            text: {
              pl: "50 cm",
              en: "50 cm",
            },
          },
          {
            id: "i3",
            text: {
              pl: "150 cm",
              en: "150 cm",
            },
          },
          {
            id: "i4",
            text: {
              pl: "1 m",
              en: "1 m",
            },
          },
        ],
        first_label: {
          pl: "najkrótsza",
          en: "shortest",
        },
        last_label: {
          pl: "najdłuższa",
          en: "longest",
        },
      },
      key: {
        orders: [["i2", "i4", "i3", "i1"]],
      },
    },
    scenarios: [
      {
        try: {
          pl: "Ułóż 85 cm, 1 m, 120 cm, 2 m",
          en: "Order 85 cm, 1 m, 120 cm, 2 m",
        },
        value: ["i2", "i1", "i3", "i4"],
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Ułóż 1 m przed 85 cm (1 to mniej niż 85)",
          en: "Put 1 m before 85 cm (1 is less than 85)",
        },
        value: ["i1", "i2", "i3", "i4"],
        outcome: "incorrect",
        mistake_class: "swapped_neighbours",
        marks: [],
      },
      {
        try: {
          pl: "Ułóż 85 cm, 120 cm, 2 m, 1 m (metr na końcu, jakby był najdłuższy)",
          en: "Order 85 cm, 120 cm, 2 m, 1 m (the metre last, as if it were longest)",
        },
        value: ["i2", "i3", "i4", "i1"],
        outcome: "incorrect",
        mistake_class: "one_misplaced",
        marks: [],
      },
      {
        try: {
          pl: "Ułóż według samych liczb: 1 m, 2 m, 85 cm, 120 cm",
          en: "Order by the bare numbers: 1 m, 2 m, 85 cm, 120 cm",
        },
        value: ["i1", "i4", "i2", "i3"],
        outcome: "incorrect",
        mistake_class: "other_order",
        marks: [],
      },
      {
        try: {
          pl: "Ułóż od najdłuższej",
          en: "Order longest first",
        },
        value: ["i4", "i3", "i1", "i2"],
        outcome: "incorrect",
        mistake_class: "reversed",
        marks: [],
      },
    ],
  },
  {
    id: "repeated-addition",
    label: "Tiles that repeat: 3 × 4 as 4 + 4 + 4",
    question: {
      question_type: "order",
      family: "sequence",
      say: {
        pl: "Zapisz 3 razy 4 jako dodawanie.",
        en: "Write 3 times 4 as repeated addition.",
      },
      data: {
        stem: {
          text: "$3 \\times 4$",
        },
        items: [],
        first_label: {
          pl: "początek",
          en: "start",
        },
        last_label: {
          pl: "koniec",
          en: "end",
        },
        tiles: [
          {
            id: "t4",
            text: "4",
          },
          {
            id: "tp",
            text: "+",
          },
          {
            id: "t3",
            text: "3",
          },
          {
            id: "tx",
            text: "×",
          },
        ],
        slots: 5,
      },
      key: {
        orders: [["t4", "tp", "t4", "tp", "t4"]],
      },
      help: {
        look: {
          text: {
            pl: "3 razy 4 to trzy czwórki. Ile czwórek ułożysz i co stoi między nimi?",
            en: "3 times 4 is three fours. How many fours will you lay down, and what goes between them?",
          },
          focus: ["s1"],
        },
        boost: {
          text: {
            pl: "Pierwsze miejsce ma już 4. Między czwórkami stoi znak dodawania.",
            en: "The first place already has 4. Between the fours goes the adding sign.",
          },
        },
        give: ["s1"],
        boost_by_mistake: {
          extra_tile: {
            text: {
              pl: "Dodawanie to znak +. Znak × to mnożenie.",
              en: "Adding is the + sign. The × sign is multiplying.",
            },
          },
          missing_tile: {
            text: {
              pl: "Policz czwórki: 3 razy 4 to trzy czwórki.",
              en: "Count the fours: 3 times 4 is three fours.",
            },
          },
          swapped_neighbours: {
            text: {
              pl: "Zacznij od liczby, nie od znaku.",
              en: "Start with a number, not a sign.",
            },
          },
        },
        worked: [
          {
            pl: "3 razy 4 to trzy czwórki",
            en: "3 times 4 is three fours",
          },
          "4 + 4 + 4",
        ],
      },
    },
    twin: {
      question_type: "order",
      family: "sequence",
      say: {
        pl: "Zapisz 2 razy 5 jako dodawanie.",
        en: "Write 2 times 5 as repeated addition.",
      },
      data: {
        stem: {
          text: "$2 \\times 5$",
        },
        items: [],
        first_label: {
          pl: "początek",
          en: "start",
        },
        last_label: {
          pl: "koniec",
          en: "end",
        },
        tiles: [
          {
            id: "t5",
            text: "5",
          },
          {
            id: "tp",
            text: "+",
          },
          {
            id: "t2",
            text: "2",
          },
          {
            id: "tx",
            text: "×",
          },
        ],
        slots: 3,
      },
      key: {
        orders: [["t5", "tp", "t5"]],
      },
    },
    scenarios: [
      {
        try: {
          pl: "Ułóż 4 + 4 + 4",
          en: "Build 4 + 4 + 4",
        },
        value: ["t4", "tp", "t4", "tp", "t4"],
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zacznij od plusa: + 4 4 + 4",
          en: "Start with the plus: + 4 4 + 4",
        },
        value: ["tp", "t4", "t4", "tp", "t4"],
        outcome: "incorrect",
        mistake_class: "swapped_neighbours",
        marks: [],
      },
      {
        try: {
          pl: "Ułóż 4 × 4 × 4",
          en: "Build 4 × 4 × 4",
        },
        value: ["t4", "tx", "t4", "tx", "t4"],
        outcome: "incorrect",
        mistake_class: "extra_tile",
        marks: [],
      },
      {
        try: {
          pl: "Ułóż 4 + 4 + +",
          en: "Build 4 + 4 + +",
        },
        value: ["t4", "tp", "t4", "tp", "tp"],
        outcome: "incorrect",
        mistake_class: "missing_tile",
        marks: [],
      },
    ],
  },
];
