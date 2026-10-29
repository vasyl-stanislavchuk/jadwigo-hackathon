// The group family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const GROUP_EXAMPLES: WrittenExample[] = [
  {
    id: "halves-or-not",
    label: "Sort into groups, picture cards: shapes cut into halves or not, two near misses",
    showcase: true,
    question: {
      question_type: "bucket",
      family: "group",
      say: {
        pl: "Które figury są podzielone na połowy?",
        en: "Which shapes are cut into halves?",
      },
      data: {
        groups: [
          {
            id: "halves",
            label: {
              pl: "na połowy",
              en: "into halves",
            },
          },
          {
            id: "not",
            label: {
              pl: "nie na połowy",
              en: "not into halves",
            },
          },
        ],
        items: [
          {
            id: "h1",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2210%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2240%22%2F%3E%3Cline%20x1%3D%2240%22%20y1%3D%2220%22%20x2%3D%2240%22%20y2%3D%2260%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Prostokąt podzielony na dwie części",
                en: "A rectangle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "h4",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2210%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2240%22%2F%3E%3Cline%20x1%3D%2225%22%20y1%3D%2220%22%20x2%3D%2225%22%20y2%3D%2260%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Prostokąt podzielony na dwie części",
                en: "A rectangle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "h2",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2240%22%20r%3D%2230%22%2F%3E%3Cline%20x1%3D%2240%22%20y1%3D%2210%22%20x2%3D%2240%22%20y2%3D%2270%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Koło podzielone na dwie części",
                en: "A circle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "h6",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2210%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2240%22%2F%3E%3Cline%20x1%3D%2230%22%20y1%3D%2220%22%20x2%3D%2230%22%20y2%3D%2260%22%2F%3E%3Cline%20x1%3D%2250%22%20y1%3D%2220%22%20x2%3D%2250%22%20y2%3D%2260%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Prostokąt podzielony na trzy części",
                en: "A rectangle cut into three parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "h3",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Cline%20x1%3D%2210%22%20y1%3D%2270%22%20x2%3D%2270%22%20y2%3D%2210%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Kwadrat podzielony na dwie części",
                en: "A square cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "h5",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2240%22%20r%3D%2230%22%2F%3E%3Cline%20x1%3D%2222%22%20y1%3D%2216%22%20x2%3D%2222%22%20y2%3D%2264%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Koło podzielone na dwie części",
                en: "A circle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          h1: ["halves"],
          h2: ["halves"],
          h3: ["halves"],
          h4: ["not"],
          h5: ["not"],
          h6: ["not"],
        },
        near: {
          h4: {
            halves: "unequal_parts",
          },
          h5: {
            halves: "unequal_parts",
          },
          h6: {
            halves: "not_two_parts",
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz części każdej figury. Potem porównaj: czy są tak samo duże?",
            en: "Count the parts of each shape. Then compare: are they the same size?",
          },
          focus: ["halves", "not"],
        },
        give: ["h1"],
        boost: {
          text: {
            pl: "Połowy to dwie części tak samo duże. Złóż figurę w myślach wzdłuż kreski: połowy nakryją się dokładnie.",
            en: "Halves are two parts the same size. Fold the shape along the line in your head: halves cover each other exactly.",
          },
        },
        boost_by_mistake: {
          unequal_parts: {
            text: {
              pl: "Dwie części to jeszcze nie połowy. Porównaj je: czy jedna nie jest większa?",
              en: "Two parts are not halves yet. Compare them: is one of them bigger?",
            },
          },
          not_two_parts: {
            text: {
              pl: "Policz części jeszcze raz, palcem. Połowy są zawsze dwie.",
              en: "Count the parts again, with your finger. There are always two halves.",
            },
          },
        },
        almost: [
          {
            pl: "Prostokąt z kreską w środku, koło przecięte przez środek, kwadrat przecięty po przekątnej: dwie równe części, to połowy.",
            en: "The rectangle cut in the middle, the circle cut through its centre, the square cut corner to corner: two equal parts, so halves.",
          },
          {
            pl: "Prostokąt i koło przecięte przy boku: jedna część jest większa, to nie połowy.",
            en: "The rectangle and the circle cut near the side: one part is bigger, so not halves.",
          },
          {
            pl: "Prostokąt z dwiema kreskami: □",
            en: "The rectangle with two lines: □",
          },
        ],
        worked: [
          {
            pl: "Prostokąt z kreską w środku, koło przecięte przez środek, kwadrat przecięty po przekątnej: dwie równe części, to połowy.",
            en: "The rectangle cut in the middle, the circle cut through its centre, the square cut corner to corner: two equal parts, so halves.",
          },
          {
            pl: "Prostokąt i koło przecięte przy boku: jedna część jest większa, to nie połowy.",
            en: "The rectangle and the circle cut near the side: one part is bigger, so not halves.",
          },
          {
            pl: "Prostokąt z dwiema kreskami: trzy części, to nie połowy.",
            en: "The rectangle with two lines: three parts, so not halves.",
          },
        ],
      },
    },
    twin: {
      question_type: "bucket",
      family: "group",
      say: {
        pl: "Które figury są podzielone na połowy?",
        en: "Which shapes are cut into halves?",
      },
      data: {
        groups: [
          {
            id: "halves",
            label: {
              pl: "na połowy",
              en: "into halves",
            },
          },
          {
            id: "not",
            label: {
              pl: "nie na połowy",
              en: "not into halves",
            },
          },
        ],
        items: [
          {
            id: "t1",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Cpolygon%20points%3D%2240%2C10%2070%2C70%2010%2C70%22%2F%3E%3Cline%20x1%3D%2240%22%20y1%3D%2210%22%20x2%3D%2240%22%20y2%3D%2270%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Trójkąt podzielony na dwie części",
                en: "A triangle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "t2",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Cline%20x1%3D%2210%22%20y1%3D%2225%22%20x2%3D%2270%22%20y2%3D%2225%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Kwadrat podzielony na dwie części",
                en: "A square cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "t3",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2240%22%20r%3D%2230%22%2F%3E%3Cline%20x1%3D%2210%22%20y1%3D%2240%22%20x2%3D%2270%22%20y2%3D%2240%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Koło podzielone na dwie części",
                en: "A circle cut into two parts",
              },
              width: 80,
              height: 80,
            },
          },
          {
            id: "t4",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2080%2080%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%225%22%20y%3D%2220%22%20width%3D%2270%22%20height%3D%2240%22%2F%3E%3Cline%20x1%3D%2222.5%22%20y1%3D%2220%22%20x2%3D%2222.5%22%20y2%3D%2260%22%2F%3E%3Cline%20x1%3D%2240%22%20y1%3D%2220%22%20x2%3D%2240%22%20y2%3D%2260%22%2F%3E%3Cline%20x1%3D%2257.5%22%20y1%3D%2220%22%20x2%3D%2257.5%22%20y2%3D%2260%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Prostokąt podzielony na cztery części",
                en: "A rectangle cut into four parts",
              },
              width: 80,
              height: 80,
            },
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          t1: ["halves"],
          t2: ["not"],
          t3: ["halves"],
          t4: ["not"],
        },
        near: {
          t2: {
            halves: "unequal_parts",
          },
          t4: {
            halves: "not_two_parts",
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Prostokąt z kreską w środku, koło przecięte przez środek i kwadrat przecięty po przekątnej do połów, reszta do „nie na połowy”, potem {check}",
          en: "The rectangle cut in the middle, the circle cut through its centre and the square cut corner to corner to halves, the rest to not, then {check}",
        },
        value: {
          items: {
            h1: ["halves"],
            h2: ["halves"],
            h3: ["halves"],
            h4: ["not"],
            h5: ["not"],
            h6: ["not"],
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Połóż prostokąt z kreską przy boku do połów (dwie części, ale różne)",
          en: "Put the rectangle cut near its side in halves (two parts, but not the same size)",
        },
        value: {
          items: {
            h1: ["halves"],
            h2: ["halves"],
            h3: ["halves"],
            h4: ["halves"],
            h5: ["not"],
            h6: ["not"],
          },
        },
        outcome: "incorrect",
        mistake_class: "unequal_parts",
        marks: [],
      },
      {
        try: {
          pl: "Połóż prostokąt z trzema częściami do połów (części równe, ale są trzy)",
          en: "Put the rectangle in three parts in halves (equal parts, but three of them)",
        },
        value: {
          items: {
            h1: ["halves"],
            h2: ["halves"],
            h3: ["halves"],
            h4: ["not"],
            h5: ["not"],
            h6: ["halves"],
          },
        },
        outcome: "incorrect",
        mistake_class: "not_two_parts",
        marks: [],
      },
      {
        try: {
          pl: "Połóż kwadrat przecięty po przekątnej do „nie na połowy”",
          en: "Put the square cut corner to corner in not into halves",
        },
        value: {
          items: {
            h1: ["halves"],
            h2: ["halves"],
            h3: ["not"],
            h4: ["not"],
            h5: ["not"],
            h6: ["not"],
          },
        },
        outcome: "incorrect",
        mistake_class: "wrong_group",
        marks: [],
      },
    ],
  },
  {
    id: "products-by-row",
    label: "Three groups: products sorted into their times-table row",
    question: {
      question_type: "bucket",
      family: "group",
      say: {
        pl: "Do której tabliczki należy każdy wynik?",
        en: "Which times table does each product belong to?",
      },
      data: {
        groups: [
          {
            id: "r3",
            label: {
              pl: "tabliczka 3",
              en: "row of 3",
            },
          },
          {
            id: "r4",
            label: {
              pl: "tabliczka 4",
              en: "row of 4",
            },
          },
          {
            id: "r7",
            label: {
              pl: "tabliczka 7",
              en: "row of 7",
            },
          },
        ],
        items: [
          {
            id: "n9",
            label: "9",
          },
          {
            id: "n27",
            label: "27",
          },
          {
            id: "n16",
            label: "16",
          },
          {
            id: "n32",
            label: "32",
          },
          {
            id: "n49",
            label: "49",
          },
          {
            id: "n56",
            label: "56",
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          n9: ["r3"],
          n27: ["r3"],
          n16: ["r4"],
          n32: ["r4"],
          n49: ["r7"],
          n56: ["r7"],
        },
        near: {
          n27: {
            r7: "last_digit_as_row",
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Zacznij od 9. Licz trójkami: 3, 6, 9. Jest?",
            en: "Start with 9. Count in threes: 3, 6, 9. Is it there?",
          },
          focus: ["n9"],
        },
        give: ["n49"],
        boost: {
          text: {
            pl: "Licz tabliczkę po kolei. Gdy trafisz na liczbę z karty, to jej tabliczka.",
            en: "Count the row in order. When you land on the number on the card, that is its row.",
          },
        },
        boost_by_mistake: {
          last_digit_as_row: {
            text: {
              pl: "27 kończy się na 7, ale to nie znaczy, że jest w tabliczce 7. Licz siódemkami: 7, 14, 21, 28. Jest tam 27?",
              en: "27 ends in 7, but that does not put it in the row of 7. Count in sevens: 7, 14, 21, 28. Is 27 there?",
            },
          },
        },
        worked: ["9 = 3 × 3", "27 = 3 × 9", "16 = 4 × 4", "32 = 4 × 8", "49 = 7 × 7", "56 = 7 × 8"],
      },
    },
    twin: {
      question_type: "bucket",
      family: "group",
      say: {
        pl: "Do której tabliczki należy każdy wynik?",
        en: "Which times table does each product belong to?",
      },
      data: {
        groups: [
          {
            id: "r4",
            label: {
              pl: "tabliczka 4",
              en: "row of 4",
            },
          },
          {
            id: "r7",
            label: {
              pl: "tabliczka 7",
              en: "row of 7",
            },
          },
          {
            id: "r9",
            label: {
              pl: "tabliczka 9",
              en: "row of 9",
            },
          },
        ],
        items: [
          {
            id: "n12",
            label: "12",
          },
          {
            id: "n20",
            label: "20",
          },
          {
            id: "n14",
            label: "14",
          },
          {
            id: "n35",
            label: "35",
          },
          {
            id: "n18",
            label: "18",
          },
          {
            id: "n45",
            label: "45",
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          n12: ["r4"],
          n20: ["r4"],
          n14: ["r7"],
          n35: ["r7"],
          n18: ["r9"],
          n45: ["r9"],
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "9 i 27 do trójki, 16 i 32 do czwórki, 49 i 56 do siódemki",
          en: "9 and 27 to the 3s, 16 and 32 to the 4s, 49 and 56 to the 7s",
        },
        value: {
          items: {
            n9: ["r3"],
            n27: ["r3"],
            n16: ["r4"],
            n32: ["r4"],
            n49: ["r7"],
            n56: ["r7"],
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Połóż 27 do tabliczki 7",
          en: "Put 27 in the row of 7",
        },
        value: {
          items: {
            n9: ["r3"],
            n27: ["r7"],
            n16: ["r4"],
            n32: ["r4"],
            n49: ["r7"],
            n56: ["r7"],
          },
        },
        outcome: "incorrect",
        mistake_class: "last_digit_as_row",
        marks: [
          {
            id: "n9",
            correct: true,
          },
          {
            id: "n27",
            correct: false,
          },
          {
            id: "n16",
            correct: true,
          },
          {
            id: "n32",
            correct: true,
          },
          {
            id: "n49",
            correct: true,
          },
          {
            id: "n56",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Połóż 16 do tabliczki 7",
          en: "Put 16 in the row of 7",
        },
        value: {
          items: {
            n9: ["r3"],
            n27: ["r3"],
            n16: ["r7"],
            n32: ["r4"],
            n49: ["r7"],
            n56: ["r7"],
          },
        },
        outcome: "incorrect",
        mistake_class: "wrong_group",
        marks: [
          {
            id: "n9",
            correct: true,
          },
          {
            id: "n27",
            correct: true,
          },
          {
            id: "n16",
            correct: false,
          },
          {
            id: "n32",
            correct: true,
          },
          {
            id: "n49",
            correct: true,
          },
          {
            id: "n56",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "arrays-to-facts",
    label:
      "Match the pairs, picture cards: dot arrays to multiplications, two arrays of 12 as the near miss",
    showcase: true,
    question: {
      question_type: "match",
      family: "group",
      say: {
        pl: "Połącz każdy obrazek z działaniem.",
        en: "Match each picture to its multiplication.",
      },
      data: {
        groups: [
          {
            id: "g44",
            label: "4 × 4",
            capacity: 1,
          },
          {
            id: "g26",
            label: "2 × 6",
            capacity: 1,
          },
          {
            id: "g25",
            label: "2 × 5",
            capacity: 1,
          },
          {
            id: "g34",
            label: "3 × 4",
            capacity: 1,
          },
        ],
        items: [
          {
            id: "p25",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22116%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2244%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22116%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Pierwszy obrazek: kropki w równych rzędach",
                en: "First picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p34",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Drugi obrazek: kropki w równych rzędach",
                en: "Second picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p26",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22125%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22125%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Trzeci obrazek: kropki w równych rzędach",
                en: "Third picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p44",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Czwarty obrazek: kropki w równych rzędach",
                en: "Fourth picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          p25: ["g25"],
          p34: ["g34"],
          p26: ["g26"],
          p44: ["g44"],
        },
        near: {
          p34: {
            g26: "same_total",
          },
          p26: {
            g34: "same_total",
          },
          p25: {
            g26: "miscounted_row",
          },
          p44: {
            g34: "miscounted_row",
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Na każdym obrazku policz rzędy. Potem policz kropki w jednym rzędzie.",
            en: "On each picture count the rows. Then count the dots in one row.",
          },
          focus: ["p25", "p34", "p26", "p44"],
        },
        give: ["p44"],
        boost: {
          text: {
            pl: "Pierwsza liczba mówi, ile jest rzędów. Druga mówi, ile kropek jest w jednym rzędzie.",
            en: "The first number says how many rows. The second says how many dots are in one row.",
          },
        },
        boost_by_mistake: {
          same_total: {
            text: {
              pl: "Na dwóch obrazkach jest tyle samo kropek. Nie licz wszystkich: policz rzędy.",
              en: "Two pictures hold the same number of dots. Do not count them all: count the rows.",
            },
          },
          miscounted_row: {
            text: {
              pl: "Policz kropki w jednym rzędzie palcem, po jednej.",
              en: "Count the dots in one row with your finger, one at a time.",
            },
          },
        },
        almost: [
          {
            pl: "Pierwszy obrazek: 2 rzędy po 5 kropek, to 2 × 5.",
            en: "First picture: 2 rows of 5 dots, so 2 × 5.",
          },
          {
            pl: "Drugi obrazek: 3 rzędy po 4 kropki, to 3 × 4.",
            en: "Second picture: 3 rows of 4 dots, so 3 × 4.",
          },
          {
            pl: "Czwarty obrazek: 4 rzędy po 4 kropki, to 4 × 4.",
            en: "Fourth picture: 4 rows of 4 dots, so 4 × 4.",
          },
          {
            pl: "Trzeci obrazek: 2 rzędy po 6 kropek, to □",
            en: "Third picture: 2 rows of 6 dots, so □",
          },
        ],
        worked: [
          {
            pl: "Pierwszy obrazek: 2 rzędy po 5 kropek, to 2 × 5.",
            en: "First picture: 2 rows of 5 dots, so 2 × 5.",
          },
          {
            pl: "Drugi obrazek: 3 rzędy po 4 kropki, to 3 × 4.",
            en: "Second picture: 3 rows of 4 dots, so 3 × 4.",
          },
          {
            pl: "Czwarty obrazek: 4 rzędy po 4 kropki, to 4 × 4.",
            en: "Fourth picture: 4 rows of 4 dots, so 4 × 4.",
          },
          {
            pl: "Trzeci obrazek: 2 rzędy po 6 kropek, to 2 × 6.",
            en: "Third picture: 2 rows of 6 dots, so 2 × 6.",
          },
        ],
      },
    },
    twin: {
      question_type: "match",
      family: "group",
      say: {
        pl: "Połącz każdy obrazek z działaniem.",
        en: "Match each picture to its multiplication.",
      },
      data: {
        groups: [
          {
            id: "g33",
            label: "3 × 3",
            capacity: 1,
          },
          {
            id: "g44",
            label: "4 × 4",
            capacity: 1,
          },
          {
            id: "g23",
            label: "2 × 3",
            capacity: 1,
          },
          {
            id: "g28",
            label: "2 × 8",
            capacity: 1,
          },
        ],
        items: [
          {
            id: "p23",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Pierwszy obrazek: kropki w równych rzędach",
                en: "First picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p33",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2227%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2245%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2280%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2298%22%20cy%3D%2263%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Drugi obrazek: kropki w równych rzędach",
                en: "Second picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p28",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22125%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22143%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2217%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2235%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22125%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22143%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Trzeci obrazek: kropki w równych rzędach",
                en: "Third picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
          {
            id: "p44",
            label: "",
            picture: {
              src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%2090%22%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2218%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2236%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2254%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2253%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2271%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%2289%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3Ccircle%20cx%3D%22107%22%20cy%3D%2272%22%20r%3D%226%22%20fill%3D%22black%22%2F%3E%3C%2Fsvg%3E",
              alt: {
                pl: "Czwarty obrazek: kropki w równych rzędach",
                en: "Fourth picture: dots in equal rows",
              },
              width: 160,
              height: 90,
            },
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          p23: ["g23"],
          p33: ["g33"],
          p28: ["g28"],
          p44: ["g44"],
        },
        near: {
          p28: {
            g44: "same_total",
          },
          p44: {
            g28: "same_total",
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Ułóż po prawej: 2 × 5, 3 × 4, 2 × 6, 4 × 4, potem {check}",
          en: "Order the right column: 2 × 5, 3 × 4, 2 × 6, 4 × 4, then {check}",
        },
        value: {
          items: {
            p25: ["g25"],
            p34: ["g34"],
            p26: ["g26"],
            p44: ["g44"],
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zamień 3 × 4 i 2 × 6 (na obu obrazkach jest 12 kropek)",
          en: "Swap 3 × 4 and 2 × 6 (both pictures hold 12 dots)",
        },
        value: {
          items: {
            p25: ["g25"],
            p34: ["g26"],
            p26: ["g34"],
            p44: ["g44"],
          },
        },
        outcome: "incorrect",
        mistake_class: "same_total",
        marks: [
          {
            id: "p25",
            correct: true,
          },
          {
            id: "p34",
            correct: false,
          },
          {
            id: "p26",
            correct: false,
          },
          {
            id: "p44",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Zamień 2 × 5 i 4 × 4",
          en: "Swap 2 × 5 and 4 × 4",
        },
        value: {
          items: {
            p25: ["g44"],
            p34: ["g34"],
            p26: ["g26"],
            p44: ["g25"],
          },
        },
        outcome: "incorrect",
        mistake_class: "wrong_group",
        marks: [
          {
            id: "p25",
            correct: false,
          },
          {
            id: "p34",
            correct: true,
          },
          {
            id: "p26",
            correct: true,
          },
          {
            id: "p44",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "facts-to-answers",
    label:
      "Each fact to its answer: four pairs, two neighbouring facts (6 × 7 and 6 × 8) as the near miss",
    question: {
      question_type: "match",
      family: "group",
      say: {
        pl: "Połącz każde działanie z wynikiem.",
        en: "Match each fact to its answer.",
      },
      data: {
        groups: [
          {
            id: "a27",
            label: "27",
            capacity: 1,
          },
          {
            id: "a48",
            label: "48",
            capacity: 1,
          },
          {
            id: "a42",
            label: "42",
            capacity: 1,
          },
          {
            id: "a32",
            label: "32",
            capacity: 1,
          },
        ],
        items: [
          {
            id: "f1",
            label: "6 × 7",
          },
          {
            id: "f2",
            label: "8 × 4",
          },
          {
            id: "f3",
            label: "9 × 3",
          },
          {
            id: "f4",
            label: "6 × 8",
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          f1: ["a42"],
          f2: ["a32"],
          f3: ["a27"],
          f4: ["a48"],
        },
        near: {
          f1: {
            a48: "neighbour_row",
          },
          f4: {
            a42: "neighbour_row",
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz każde działanie, potem znajdź jego wynik.",
            en: "Work out each fact, then find its answer.",
          },
          focus: ["f1", "f2", "f3", "f4"],
        },
        boost: {
          text: {
            pl: "Jedno działanie już stoi na miejscu. Zostaje mniej do wyboru. Zacznij od tego, które znasz najlepiej.",
            en: "One fact is in place for you. There are fewer left to choose from. Start with the one you know best.",
          },
        },
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "6 × 7 i 6 × 8 to sąsiedzi. Ten, który ma o jedną szóstkę więcej, ma większy wynik.",
              en: "6 × 7 and 6 × 8 are neighbours. The one with one more 6 has the bigger answer.",
            },
          },
        },
        give: ["f2"],
        almost: ["8 × 4 = 32", "9 × 3 = 27", "6 × 7 = 42", "6 × 8 = 42 + 6 = □"],
        worked: ["8 × 4 = 32", "9 × 3 = 27", "6 × 7 = 42", "6 × 8 = 42 + 6 = 48"],
      },
    },
    twin: {
      question_type: "match",
      family: "group",
      say: {
        pl: "Połącz każde działanie z wynikiem.",
        en: "Match each fact to its answer.",
      },
      data: {
        groups: [
          {
            id: "a35",
            label: "35",
            capacity: 1,
          },
          {
            id: "a18",
            label: "18",
            capacity: 1,
          },
          {
            id: "a24",
            label: "24",
            capacity: 1,
          },
        ],
        items: [
          {
            id: "f1",
            label: "4 × 6",
          },
          {
            id: "f2",
            label: "5 × 7",
          },
          {
            id: "f3",
            label: "3 × 6",
          },
        ],
        each_item: "one",
      },
      key: {
        items: {
          f1: ["a24"],
          f2: ["a35"],
          f3: ["a18"],
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "6 × 7 do 42, 8 × 4 do 32, 9 × 3 do 27, 6 × 8 do 48",
          en: "6 × 7 to 42, 8 × 4 to 32, 9 × 3 to 27, 6 × 8 to 48",
        },
        value: {
          items: {
            f1: ["a42"],
            f2: ["a32"],
            f3: ["a27"],
            f4: ["a48"],
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zamień 42 i 48 (sąsiednie wyniki z tabliczki 6)",
          en: "Swap 42 and 48 (neighbours in the row of 6)",
        },
        value: {
          items: {
            f1: ["a48"],
            f2: ["a32"],
            f3: ["a27"],
            f4: ["a42"],
          },
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [
          {
            id: "f1",
            correct: false,
          },
          {
            id: "f2",
            correct: true,
          },
          {
            id: "f3",
            correct: true,
          },
          {
            id: "f4",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Zamień 32 i 27",
          en: "Swap 32 and 27",
        },
        value: {
          items: {
            f1: ["a42"],
            f2: ["a27"],
            f3: ["a32"],
            f4: ["a48"],
          },
        },
        outcome: "incorrect",
        mistake_class: "wrong_group",
        marks: [
          {
            id: "f1",
            correct: true,
          },
          {
            id: "f2",
            correct: false,
          },
          {
            id: "f3",
            correct: false,
          },
          {
            id: "f4",
            correct: true,
          },
        ],
      },
    ],
  },
];
