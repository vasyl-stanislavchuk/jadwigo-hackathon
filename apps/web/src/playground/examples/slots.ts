// The slots family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const SLOTS_EXAMPLES: WrittenExample[] = [
  {
    id: "missing-factor",
    label: "One missing factor in an equation: a times-table fact asked backwards (6 × □ = 54)",
    showcase: true,
    question: {
      question_type: "fill_gaps",
      family: "slots",
      say: {
        pl: "Jaka liczba pasuje w puste miejsce? Sześć razy ile to pięćdziesiąt cztery?",
        en: "Which number fits the gap? Six times what is fifty-four?",
      },
      data: {
        template: "6 × {g1} = 54",
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["9"],
            near: {
              "8": "neighbour_row",
              "10": "neighbour_row",
              "48": "subtracted_not_divided",
              "60": "added_not_divided",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Szukasz liczby, która razy 6 daje 54. To jest pytanie z tabliczki mnożenia przez 6.",
            en: "You are looking for the number that makes 54 when multiplied by 6. It is a question from the six times table.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Licz szóstkami: 6, 12, 18, 24 i dalej, aż dojdziesz do 54. Ile szóstek było?",
            en: "Count in sixes: 6, 12, 18, 24 and on, until you reach 54. How many sixes was that?",
          },
        },
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "Sprawdź: 6 razy twoja liczba. Czy wychodzi dokładnie 54?",
              en: "Check: 6 times your number. Does it make exactly 54?",
            },
          },
          subtracted_not_divided: {
            text: {
              pl: "To jest 54 bez jednej szóstki. Pytamy, ile szóstek mieści się w 54.",
              en: "That is 54 with one six taken away. We ask how many sixes fit into 54.",
            },
          },
        },
        worked: ["6 × 10 = 60", "60 − 6 = 54", "6 × 9 = 54"],
        almost: ["6 × 10 = 60", "60 − 6 = 54", "6 × □ = 54"],
      },
    },
    twin: {
      question_type: "fill_gaps",
      family: "slots",
      say: {
        pl: "Jaka liczba pasuje w puste miejsce? Siedem razy ile to czterdzieści dwa?",
        en: "Which number fits the gap? Seven times what is forty-two?",
      },
      data: {
        template: "7 × {g1} = 42",
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["6"],
            near: {
              "5": "neighbour_row",
              "7": "neighbour_row",
              "35": "subtracted_not_divided",
              "49": "added_not_divided",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 9",
          en: "Type 9",
        },
        value: {
          gaps: {
            g1: "9",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 8 (6 × 8, rząd obok)",
          en: "Type 8 (6 × 8, the row next door)",
        },
        value: {
          gaps: {
            g1: "8",
          },
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [
          {
            id: "g1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 48 (54 − 6, odjęte zamiast podzielone)",
          en: "Type 48 (54 − 6, taken away instead of divided)",
        },
        value: {
          gaps: {
            g1: "48",
          },
        },
        outcome: "incorrect",
        mistake_class: "subtracted_not_divided",
        marks: [
          {
            id: "g1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 5",
          en: "Type 5",
        },
        value: {
          gaps: {
            g1: "5",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "g1",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "lollipops",
    label:
      "Reading in context: a shop story with four chosen gaps of different kinds (the operation, two numbers, a comparison word)",
    showcase: true,
    question: {
      question_type: "fill_gaps",
      family: "slots",
      say: {
        pl: "Przeczytaj historyjkę i w każdej luce wybierz pasujące słowo albo liczbę.",
        en: "Read the story and choose the word or number that fits each gap.",
      },
      data: {
        template: {
          pl: "Zosia ma 18 zł. Jeden lizak kosztuje 3 zł. Żeby policzyć, ile lizaków kupi, Zosia użyje {g1}. Za 18 zł kupi ich {g2}. Gdyby lizak kosztował 2 zł, kupiłaby ich {g3}. Kiedy lizaki są tańsze, za te same pieniądze kupuje się ich {g4}.",
          en: "Zosia has 18 zł. One lollipop costs 3 zł. To work out how many lollipops she can buy, Zosia uses {g1}. With 18 zł she can buy {g2}. If a lollipop cost 2 zł, she could buy {g3}. When lollipops are cheaper, the same money buys {g4} of them.",
        },
        gaps: [
          {
            id: "g1",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: {
                  pl: "mnożenia",
                  en: "multiplication",
                },
              },
              {
                id: "c2",
                label: {
                  pl: "dzielenia",
                  en: "division",
                },
              },
              {
                id: "c3",
                label: {
                  pl: "odejmowania",
                  en: "subtraction",
                },
              },
            ],
          },
          {
            id: "g2",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: "6",
              },
              {
                id: "c2",
                label: "15",
              },
              {
                id: "c3",
                label: "54",
              },
            ],
          },
          {
            id: "g3",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: "16",
              },
              {
                id: "c2",
                label: "6",
              },
              {
                id: "c3",
                label: "9",
              },
            ],
          },
          {
            id: "g4",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: {
                  pl: "mniej",
                  en: "fewer",
                },
              },
              {
                id: "c2",
                label: {
                  pl: "więcej",
                  en: "more",
                },
              },
              {
                id: "c3",
                label: {
                  pl: "tyle samo",
                  en: "just as many",
                },
              },
            ],
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "choose",
            correct: ["c2"],
            near: {
              c1: "multiplied_not_divided",
              c3: "subtracted_not_divided",
            },
          },
          g2: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c2: "subtracted_not_divided",
              c3: "multiplied_not_divided",
            },
          },
          g3: {
            kind: "choose",
            correct: ["c3"],
            near: {
              c1: "subtracted_not_divided",
              c2: "kept_the_old_price",
            },
          },
          g4: {
            kind: "choose",
            correct: ["c2"],
            near: {
              c1: "cheaper_means_fewer",
              c3: "price_does_not_matter",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Zosia rozkłada swoje 18 zł na równe części, każda tyle, ile kosztuje lizak. Czytaj zdania po kolei.",
            en: "Zosia shares her 18 zł out in equal parts, each the price of one lollipop. Read the sentences one by one.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Odliczaj po 3 zł, aż dojdziesz do 18 zł, i policz skoki. Potem zrób to samo po 2 zł.",
            en: "Count up in 3 zł until you reach 18 zł, and count the jumps. Then do the same in 2 zł.",
          },
        },
        boost_by_mistake: {
          kept_the_old_price: {
            text: {
              pl: "Ta liczba pasuje do lizaków po 3 zł. W tym zdaniu lizak kosztuje 2 zł.",
              en: "That number fits lollipops at 3 zł. In this sentence a lollipop costs 2 zł.",
            },
          },
          cheaper_means_fewer: {
            text: {
              pl: "Porównaj swoje dwie odpowiedzi: ile lizaków wyszło po 3 zł, a ile po 2 zł?",
              en: "Compare your two answers: how many lollipops at 3 zł, and how many at 2 zł?",
            },
          },
          multiplied_not_divided: {
            text: {
              pl: "Zosia nie kupuje 18 paczek. Ma 18 zł i sprawdza, ile razy zmieszczą się w nich 3 zł.",
              en: "Zosia is not buying 18 packs. She has 18 zł and checks how many times 3 zł fits into it.",
            },
          },
          subtracted_not_divided: {
            text: {
              pl: "Odjęcie 3 zł raz to cena jednego lizaka. Ile razy 3 zł mieści się w 18 zł?",
              en: "Taking 3 zł away once pays for one lollipop. How many times does 3 zł fit into 18 zł?",
            },
          },
        },
        worked: [
          {
            pl: "Ile razy 3 zł mieści się w 18 zł? To pytanie dzielenia.",
            en: "How many times does 3 zł fit into 18 zł? That is a division question.",
          },
          "18 : 3 = 6",
          "18 : 2 = 9",
          {
            pl: "9 to więcej niż 6",
            en: "9 is more than 6",
          },
        ],
        almost: ["18 : 3 = 6", "18 : 2 = □"],
      },
    },
    twin: {
      question_type: "fill_gaps",
      family: "slots",
      say: {
        pl: "Przeczytaj historyjkę i w każdej luce wybierz pasujące słowo albo liczbę.",
        en: "Read the story and choose the word or number that fits each gap.",
      },
      data: {
        template: {
          pl: "Staś ma 20 zł. Jeden zeszyt kosztuje 5 zł. Żeby policzyć, ile zeszytów kupi, Staś użyje {g1}. Za 20 zł kupi ich {g2}. Gdyby zeszyt kosztował 4 zł, kupiłby ich {g3}. Kiedy zeszyty są tańsze, za te same pieniądze kupuje się ich {g4}.",
          en: "Staś has 20 zł. One notebook costs 5 zł. To work out how many notebooks he can buy, Staś uses {g1}. With 20 zł he can buy {g2}. If a notebook cost 4 zł, he could buy {g3}. When notebooks are cheaper, the same money buys {g4} of them.",
        },
        gaps: [
          {
            id: "g1",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: {
                  pl: "dzielenia",
                  en: "division",
                },
              },
              {
                id: "c2",
                label: {
                  pl: "dodawania",
                  en: "addition",
                },
              },
              {
                id: "c3",
                label: {
                  pl: "mnożenia",
                  en: "multiplication",
                },
              },
            ],
          },
          {
            id: "g2",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: "15",
              },
              {
                id: "c2",
                label: "4",
              },
              {
                id: "c3",
                label: "100",
              },
            ],
          },
          {
            id: "g3",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: "5",
              },
              {
                id: "c2",
                label: "4",
              },
              {
                id: "c3",
                label: "16",
              },
            ],
          },
          {
            id: "g4",
            kind: "choose",
            options: [
              {
                id: "c1",
                label: {
                  pl: "więcej",
                  en: "more",
                },
              },
              {
                id: "c2",
                label: {
                  pl: "tyle samo",
                  en: "just as many",
                },
              },
              {
                id: "c3",
                label: {
                  pl: "mniej",
                  en: "fewer",
                },
              },
            ],
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c2: "added_not_divided",
              c3: "multiplied_not_divided",
            },
          },
          g2: {
            kind: "choose",
            correct: ["c2"],
            near: {
              c1: "subtracted_not_divided",
              c3: "multiplied_not_divided",
            },
          },
          g3: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c2: "kept_the_old_price",
              c3: "subtracted_not_divided",
            },
          },
          g4: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c2: "price_does_not_matter",
              c3: "cheaper_means_fewer",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wybierz „dzielenia”, 6, 9, „więcej”",
          en: "Choose division, 6, 9, more",
        },
        value: {
          gaps: {
            g1: "c2",
            g2: "c1",
            g3: "c3",
            g4: "c2",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wybierz 6 w trzeciej luce (stara cena)",
          en: "Choose 6 in the third gap (the old price kept)",
        },
        value: {
          gaps: {
            g1: "c2",
            g2: "c1",
            g3: "c2",
            g4: "c2",
          },
        },
        outcome: "incorrect",
        mistake_class: "kept_the_old_price",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: false,
          },
          {
            id: "g4",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Wybierz „mniej” w ostatniej luce",
          en: "Choose fewer in the last gap",
        },
        value: {
          gaps: {
            g1: "c2",
            g2: "c1",
            g3: "c3",
            g4: "c1",
          },
        },
        outcome: "incorrect",
        mistake_class: "cheaper_means_fewer",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: true,
          },
          {
            id: "g4",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wybierz „mnożenia” i 54",
          en: "Choose multiplication and 54",
        },
        value: {
          gaps: {
            g1: "c1",
            g2: "c3",
            g3: "c3",
            g4: "c2",
          },
        },
        outcome: "incorrect",
        mistake_class: "multiplied_not_divided",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: false,
          },
          {
            id: "g3",
            correct: true,
          },
          {
            id: "g4",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "fact-family",
    label: "A fact family: four facts from one array",
    showcase: true,
    question: {
      question_type: "fill_table",
      family: "slots",
      say: {
        pl: "Uzupełnij rodzinę działań dla trzech i czterech.",
        en: "Complete the fact family for three and four.",
      },
      data: {
        template: "",
        table: {
          header: [
            {
              pl: "Działanie",
              en: "Fact",
            },
            {
              pl: "Wynik",
              en: "Answer",
            },
          ],
          rows: [
            ["3 × 4", "{g1}"],
            ["4 × 3", "{g2}"],
            ["12 : 3", "{g3}"],
            ["12 : 4", "{g4}"],
          ],
        },
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
          },
          {
            id: "g3",
            kind: "enter",
            input: "number",
          },
          {
            id: "g4",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["12"],
            near: {
              "7": "added_not_multiplied",
            },
          },
          g2: {
            kind: "enter",
            accept: ["12"],
            near: {
              "7": "added_not_multiplied",
            },
          },
          g3: {
            kind: "enter",
            accept: ["4"],
          },
          g4: {
            kind: "enter",
            accept: ["3"],
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Wszystkie cztery działania opowiadają o tych samych kropkach: trzy rzędy po cztery. Zacznij od mnożenia.",
            en: "All four facts tell about the same dots: three rows of four. Start with the multiplication.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Obróć kropki: cztery rzędy po trzy to tyle samo. Przy dzieleniu zapytaj: ile jest rzędów, a ile kropek w rzędzie?",
            en: "Turn the dots round: four rows of three is just as many. For the divisions ask: how many rows are there, and how many dots in a row?",
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
        boost_by_mistake: {
          gap_swap: {
            text: {
              pl: "Dwa wyniki dzielenia są zamienione. Dzielenie przez trzy pyta: ile trójek?",
              en: "The two division answers are swapped. Dividing by three asks: how many threes?",
            },
          },
        },
        worked: ["3 × 4 = 12", "4 × 3 = 12", "12 : 3 = 4", "12 : 4 = 3"],
      },
    },
    twin: {
      question_type: "fill_table",
      family: "slots",
      say: {
        pl: "Uzupełnij rodzinę działań dla dwóch i pięciu.",
        en: "Complete the fact family for two and five.",
      },
      data: {
        template: "",
        table: {
          header: [
            {
              pl: "Działanie",
              en: "Fact",
            },
            {
              pl: "Wynik",
              en: "Answer",
            },
          ],
          rows: [
            ["2 × 5", "{g1}"],
            ["5 × 2", "{g2}"],
            ["10 : 2", "{g3}"],
            ["10 : 5", "{g4}"],
          ],
        },
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
          },
          {
            id: "g3",
            kind: "enter",
            input: "number",
          },
          {
            id: "g4",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["10"],
            near: {
              "7": "added_not_multiplied",
            },
          },
          g2: {
            kind: "enter",
            accept: ["10"],
            near: {
              "7": "added_not_multiplied",
            },
          },
          g3: {
            kind: "enter",
            accept: ["5"],
          },
          g4: {
            kind: "enter",
            accept: ["2"],
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 12, 12, 4 i 3",
          en: "Type 12, 12, 4 and 3",
        },
        value: {
          gaps: {
            g1: "12",
            g2: "12",
            g3: "4",
            g4: "3",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 12, 12, 3 i 4 (dzielenie zamienione)",
          en: "Type 12, 12, 3 and 4 (the divisions swapped)",
        },
        value: {
          gaps: {
            g1: "12",
            g2: "12",
            g3: "3",
            g4: "4",
          },
        },
        outcome: "incorrect",
        mistake_class: "gap_swap",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: false,
          },
          {
            id: "g4",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 7 w pierwszej komórce",
          en: "Type 7 in the first cell",
        },
        value: {
          gaps: {
            g1: "7",
            g2: "12",
            g3: "4",
            g4: "3",
          },
        },
        outcome: "incorrect",
        mistake_class: "added_not_multiplied",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: true,
          },
          {
            id: "g4",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "times-table-row",
    label: "A row of the times table with two cells to fill",
    question: {
      question_type: "fill_table",
      family: "slots",
      say: {
        pl: "Uzupełnij rząd tabliczki mnożenia przez siedem.",
        en: "Complete the row of the seven times table.",
      },
      data: {
        template: "",
        table: {
          header: ["×", "1", "2", "3", "4", "5", "6"],
          rows: [["7", "7", "14", "{g1}", "28", "{g2}", "42"]],
        },
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["21"],
            near: {
              "24": "neighbour_row",
            },
          },
          g2: {
            kind: "enter",
            accept: ["35"],
            near: {
              "30": "neighbour_row",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "W tym rzędzie każda liczba jest o 7 większa od tej przed nią.",
            en: "In this row, each number is 7 more than the one before it.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Weź liczbę tuż przed pustą kratką i dodaj do niej 7.",
            en: "Take the number just before the empty cell and add 7 to it.",
          },
        },
        boost_by_mistake: {
          neighbour_row: {
            text: {
              pl: "To liczba z innego rzędu tabliczki. Tu każdy krok to 7.",
              en: "That number is from another row of the table. Here every step is 7.",
            },
          },
        },
        worked: ["14 + 7 = 21", "28 + 7 = 35"],
      },
    },
    twin: {
      question_type: "fill_table",
      family: "slots",
      say: {
        pl: "Uzupełnij rząd tabliczki mnożenia przez osiem.",
        en: "Complete the row of the eight times table.",
      },
      data: {
        template: "",
        table: {
          header: ["×", "1", "2", "3", "4", "5", "6"],
          rows: [["8", "8", "16", "{g1}", "32", "{g2}", "48"]],
        },
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["24"],
            near: {
              "21": "neighbour_row",
              "27": "neighbour_row",
            },
          },
          g2: {
            kind: "enter",
            accept: ["40"],
            near: {
              "35": "neighbour_row",
              "45": "neighbour_row",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 21 i 35",
          en: "Type 21 and 35",
        },
        value: {
          gaps: {
            g1: "21",
            g2: "35",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 24 i 35",
          en: "Type 24 and 35",
        },
        value: {
          gaps: {
            g1: "24",
            g2: "35",
          },
        },
        outcome: "incorrect",
        mistake_class: "neighbour_row",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 21 i 36",
          en: "Type 21 and 36",
        },
        value: {
          gaps: {
            g1: "21",
            g2: "36",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "number-line-labels",
    label: "Two blanks on a number line to label, then the product to type",
    showcase: true,
    question: {
      question_type: "label_picture",
      family: "slots",
      say: {
        pl: "Uzupełnij oś liczbową i policz trzy razy osiem.",
        en: "Complete the number line and work out three times eight.",
      },
      data: {
        picture: {
          src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%2080%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%20font-size%3D%2218%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22middle%22%3E%3Cline%20x1%3D%2210%22%20y1%3D%2230%22%20x2%3D%22390%22%20y2%3D%2230%22%2F%3E%3Cline%20x1%3D%2230%22%20y1%3D%2220%22%20x2%3D%2230%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%2230%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E0%3C%2Ftext%3E%3Cline%20x1%3D%22115%22%20y1%3D%2220%22%20x2%3D%22115%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22115%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E%3C%2Ftext%3E%3Cline%20x1%3D%22200%22%20y1%3D%2220%22%20x2%3D%22200%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E16%3C%2Ftext%3E%3Cline%20x1%3D%22285%22%20y1%3D%2220%22%20x2%3D%22285%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22285%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E%3C%2Ftext%3E%3Cline%20x1%3D%22370%22%20y1%3D%2220%22%20x2%3D%22370%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22370%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E32%3C%2Ftext%3E%3C%2Fsvg%3E",
          alt: {
            pl: "Oś liczbowa z podpisami 0, puste, 16, puste, 32, w równych odstępach.",
            en: "A number line labelled 0, blank, 16, blank, 32, at equal steps.",
          },
          width: 400,
          height: 80,
        },
        template: "3 × 8 = {g3}",
        gaps: [
          {
            id: "g1",
            kind: "choose",
            at: {
              x: 28.75,
              y: 85,
            },
            options: [
              {
                id: "c1",
                label: "8",
              },
              {
                id: "c2",
                label: "24",
              },
              {
                id: "c3",
                label: "20",
              },
            ],
          },
          {
            id: "g2",
            kind: "choose",
            at: {
              x: 71.25,
              y: 85,
            },
            options: [
              {
                id: "c1",
                label: "8",
              },
              {
                id: "c2",
                label: "24",
              },
              {
                id: "c3",
                label: "20",
              },
            ],
          },
          {
            id: "g3",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c3: "counted_in_tens",
            },
          },
          g2: {
            kind: "choose",
            correct: ["c2"],
            near: {
              c3: "counted_in_tens",
            },
          },
          g3: {
            kind: "enter",
            accept: ["24"],
            near: {
              "16": "one_jump_short",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Każdy skok na osi to osiem. Licz skoki od zera.",
            en: "Every jump on the line is eight. Count the jumps from zero.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Skacz po osi od zera, po osiem za każdym razem, i podpisz każdą kreskę. Trzy razy osiem to trzy takie skoki.",
            en: "Jump along the line from zero, eight at a time, and label each mark. Three times eight is three such jumps.",
          },
        },
        boost_by_mistake: {
          one_jump_short: {
            text: {
              pl: "To jeden skok za wcześnie. Trzy razy osiem to trzy skoki od zera.",
              en: "That is one jump too early. Three times eight is three jumps from zero.",
            },
          },
        },
        worked: ["0 + 8 = 8", "16 + 8 = 24", "3 × 8 = 24"],
      },
    },
    twin: {
      question_type: "label_picture",
      family: "slots",
      say: {
        pl: "Uzupełnij oś liczbową i policz trzy razy siedem.",
        en: "Complete the number line and work out three times seven.",
      },
      data: {
        picture: {
          src: "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%2080%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%20font-size%3D%2218%22%20font-family%3D%22sans-serif%22%20text-anchor%3D%22middle%22%3E%3Cline%20x1%3D%2210%22%20y1%3D%2230%22%20x2%3D%22390%22%20y2%3D%2230%22%2F%3E%3Cline%20x1%3D%2230%22%20y1%3D%2220%22%20x2%3D%2230%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%2230%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E0%3C%2Ftext%3E%3Cline%20x1%3D%22115%22%20y1%3D%2220%22%20x2%3D%22115%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22115%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E%3C%2Ftext%3E%3Cline%20x1%3D%22200%22%20y1%3D%2220%22%20x2%3D%22200%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22200%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E14%3C%2Ftext%3E%3Cline%20x1%3D%22285%22%20y1%3D%2220%22%20x2%3D%22285%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22285%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E%3C%2Ftext%3E%3Cline%20x1%3D%22370%22%20y1%3D%2220%22%20x2%3D%22370%22%20y2%3D%2240%22%2F%3E%3Ctext%20x%3D%22370%22%20y%3D%2272%22%20stroke%3D%22none%22%20fill%3D%22black%22%3E28%3C%2Ftext%3E%3C%2Fsvg%3E",
          alt: {
            pl: "Oś liczbowa z podpisami 0, puste, 14, puste, 28, w równych odstępach.",
            en: "A number line labelled 0, blank, 14, blank, 28, at equal steps.",
          },
          width: 400,
          height: 80,
        },
        template: "3 × 7 = {g3}",
        gaps: [
          {
            id: "g1",
            kind: "choose",
            at: {
              x: 28.75,
              y: 85,
            },
            options: [
              {
                id: "c1",
                label: "7",
              },
              {
                id: "c2",
                label: "21",
              },
              {
                id: "c3",
                label: "17",
              },
            ],
          },
          {
            id: "g2",
            kind: "choose",
            at: {
              x: 71.25,
              y: 85,
            },
            options: [
              {
                id: "c1",
                label: "7",
              },
              {
                id: "c2",
                label: "21",
              },
              {
                id: "c3",
                label: "17",
              },
            ],
          },
          {
            id: "g3",
            kind: "enter",
            input: "number",
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "choose",
            correct: ["c1"],
            near: {
              c3: "counted_in_tens",
            },
          },
          g2: {
            kind: "choose",
            correct: ["c2"],
            near: {
              c3: "counted_in_tens",
            },
          },
          g3: {
            kind: "enter",
            accept: ["21"],
            near: {
              "14": "one_jump_short",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Podpisz 8 i 24, wpisz 24",
          en: "Label 8 and 24, type 24",
        },
        value: {
          gaps: {
            g1: "c1",
            g2: "c2",
            g3: "24",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Podpisz 24 i 8 (zamienione)",
          en: "Label 24 and 8 (swapped)",
        },
        value: {
          gaps: {
            g1: "c2",
            g2: "c1",
            g3: "24",
          },
        },
        outcome: "incorrect",
        mistake_class: "gap_swap",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: false,
          },
          {
            id: "g3",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Podpisz dobrze, wpisz 16",
          en: "Label them right, type 16",
        },
        value: {
          gaps: {
            g1: "c1",
            g2: "c2",
            g3: "16",
          },
        },
        outcome: "incorrect",
        mistake_class: "one_jump_short",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Podpisz dobrze, wpisz 30",
          en: "Label them right, type 30",
        },
        value: {
          gaps: {
            g1: "c1",
            g2: "c2",
            g3: "30",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: true,
          },
          {
            id: "g3",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "add-with-carry",
    label: "Written addition with a carry: 47 + 38",
    showcase: true,
    question: {
      question_type: "column",
      family: "slots",
      say: {
        pl: "Dodaj pisemnie: czterdzieści siedem plus trzydzieści osiem.",
        en: "Add in columns: forty-seven plus thirty-eight.",
      },
      data: {
        template: "",
        column: {
          op: "add",
          operands: [47, 38],
          given_steps: 0,
          carry_row: true,
        },
        gaps: [
          {
            id: "r0",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "c1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "r1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
        ],
      },
      key: {
        gaps: {
          r0: {
            kind: "enter",
            accept: ["5"],
          },
          c1: {
            kind: "enter",
            accept: ["1"],
            near: {
              "0": "carry_not_added",
            },
          },
          r1: {
            kind: "enter",
            accept: ["8"],
            near: {
              "7": "forgot_carry",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Zacznij z prawej strony, od jedności: siedem i osiem.",
            en: "Start on the right, with the ones: seven and eight.",
          },
          focus: ["r0"],
        },
        boost: {
          text: {
            pl: "Siedem i osiem to więcej niż dziesięć, więc jedna dziesiątka idzie do małej kratki. W dziesiątkach dodaj wszystkie trzy liczby: dwie z działania i tę z małej kratki.",
            en: "Seven and eight make more than ten, so one ten goes in the small box. In the tens, add all three numbers: the two from the sum and the one in the small box.",
          },
        },
        boost_by_mistake: {
          carry_not_added: {
            text: {
              pl: "Siedem i osiem to więcej niż dziesięć. Ta dziesiątka idzie do małej kratki nad dziesiątkami.",
              en: "Seven and eight make more than ten. That ten goes in the small box above the tens.",
            },
          },
          forgot_carry: {
            text: {
              pl: "Do dziesiątek dodaj też tę jedną dziesiątkę z małej kratki.",
              en: "Add the one ten from the small box to the tens as well.",
            },
          },
        },
        worked: [
          {
            pl: "7 + 8 = 15: piszę 5, 1 w pamięci",
            en: "7 + 8 = 15: write 5, carry 1",
          },
          "4 + 3 + 1 = 8",
          "47 + 38 = 85",
        ],
        almost: [
          {
            pl: "7 + 8 = 15: piszę 5, 1 w pamięci",
            en: "7 + 8 = 15: write 5, carry 1",
          },
          "4 + 3 + 1 = □",
        ],
      },
    },
    twin: {
      question_type: "column",
      family: "slots",
      say: {
        pl: "Dodaj pisemnie: pięćdziesiąt sześć plus dwadzieścia siedem.",
        en: "Add in columns: fifty-six plus twenty-seven.",
      },
      data: {
        template: "",
        column: {
          op: "add",
          operands: [56, 27],
          given_steps: 0,
          carry_row: true,
        },
        gaps: [
          {
            id: "r0",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "c1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "r1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
        ],
      },
      key: {
        gaps: {
          r0: {
            kind: "enter",
            accept: ["3"],
          },
          c1: {
            kind: "enter",
            accept: ["1"],
            near: {
              "0": "carry_not_added",
            },
          },
          r1: {
            kind: "enter",
            accept: ["8"],
            near: {
              "7": "forgot_carry",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 5, w kratce 1, potem 8",
          en: "Type 5, 1 in the small box, then 8",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "1",
            r1: "8",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 5 i 7, kratka pusta (bez przeniesienia)",
          en: "Type 5 and 7, the small box empty (no carry)",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "",
            r1: "7",
          },
        },
        outcome: "incorrect",
        mistake_class: "carry_not_added",
        marks: [
          {
            id: "r0",
            correct: true,
          },
          {
            id: "c1",
            correct: false,
          },
          {
            id: "r1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 5, w kratce 1, potem 7 (jedynka nie dodana)",
          en: "Type 5, 1 in the small box, then 7 (the carry not added)",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "1",
            r1: "7",
          },
        },
        outcome: "incorrect",
        mistake_class: "forgot_carry",
        marks: [
          {
            id: "r0",
            correct: true,
          },
          {
            id: "c1",
            correct: true,
          },
          {
            id: "r1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 6, w kratce 1, potem 8",
          en: "Type 6, 1 in the small box, then 8",
        },
        value: {
          gaps: {
            r0: "6",
            c1: "1",
            r1: "8",
          },
        },
        outcome: "incorrect",
        mistake_class: "fact_error",
        marks: [
          {
            id: "r0",
            correct: false,
          },
          {
            id: "c1",
            correct: true,
          },
          {
            id: "r1",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "sub-with-borrow",
    label: "Written subtraction, borrowing a ten: 52 − 27",
    question: {
      question_type: "column",
      family: "slots",
      say: {
        pl: "Odejmij pisemnie: pięćdziesiąt dwa minus dwadzieścia siedem.",
        en: "Subtract in columns: fifty-two minus twenty-seven.",
      },
      data: {
        template: "",
        column: {
          op: "sub",
          operands: [52, 27],
          given_steps: 0,
          carry_row: true,
        },
        gaps: [
          {
            id: "r0",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "c1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "r1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
        ],
      },
      key: {
        gaps: {
          r0: {
            kind: "enter",
            accept: ["5"],
          },
          c1: {
            kind: "enter",
            accept: ["4"],
            near: {
              "5": "borrow_not_marked",
            },
          },
          r1: {
            kind: "enter",
            accept: ["2"],
            near: {
              "3": "forgot_borrow",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Zacznij od jedności. Czy od dwóch da się odjąć siedem?",
            en: "Start with the ones. Can you take seven from two?",
          },
          focus: ["r0"],
        },
        boost: {
          text: {
            pl: "Od dwóch nie odejmiesz siedmiu, więc pożyczasz jedną dziesiątkę i liczysz dwanaście minus siedem. W małej kratce zapisz, ile dziesiątek zostało, i w dziesiątkach odejmuj od tej liczby.",
            en: "You cannot take seven from two, so you borrow one ten and work out twelve take away seven. Write in the small box how many tens are left, and in the tens take away from that number.",
          },
        },
        boost_by_mistake: {
          borrow_not_marked: {
            text: {
              pl: "Jedna dziesiątka poszła do jedności. Zapisz w małej kratce, ile dziesiątek zostało.",
              en: "One ten went over to the ones. Write in the small box how many tens are left.",
            },
          },
          forgot_borrow: {
            text: {
              pl: "W dziesiątkach odejmuj od liczby z małej kratki, bo jedna dziesiątka poszła do jedności.",
              en: "In the tens, take away from the number in the small box: one ten went over to the ones.",
            },
          },
        },
        worked: ["12 − 7 = 5", "5 − 1 = 4", "4 − 2 = 2", "52 − 27 = 25"],
        almost: ["12 − 7 = 5", "5 − 1 = 4", "4 − 2 = □"],
      },
    },
    twin: {
      question_type: "column",
      family: "slots",
      say: {
        pl: "Odejmij pisemnie: siedemdziesiąt cztery minus trzydzieści osiem.",
        en: "Subtract in columns: seventy-four minus thirty-eight.",
      },
      data: {
        template: "",
        column: {
          op: "sub",
          operands: [74, 38],
          given_steps: 0,
          carry_row: true,
        },
        gaps: [
          {
            id: "r0",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "c1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
          {
            id: "r1",
            kind: "enter",
            input: "number",
            max_length: 1,
          },
        ],
      },
      key: {
        gaps: {
          r0: {
            kind: "enter",
            accept: ["6"],
            near: {
              "4": "borrow_error",
            },
          },
          c1: {
            kind: "enter",
            accept: ["6"],
            near: {
              "7": "borrow_not_marked",
            },
          },
          r1: {
            kind: "enter",
            accept: ["3"],
            near: {
              "4": "forgot_borrow",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 5, w kratce 4, potem 2",
          en: "Type 5, 4 in the small box, then 2",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "4",
            r1: "2",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 5 i 3, kratka pusta (dziesiątka nie pożyczona)",
          en: "Type 5 and 3, the small box empty (no ten borrowed)",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "",
            r1: "3",
          },
        },
        outcome: "incorrect",
        mistake_class: "borrow_not_marked",
        marks: [
          {
            id: "r0",
            correct: true,
          },
          {
            id: "c1",
            correct: false,
          },
          {
            id: "r1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 5, w kratce 4, potem 3",
          en: "Type 5, 4 in the small box, then 3",
        },
        value: {
          gaps: {
            r0: "5",
            c1: "4",
            r1: "3",
          },
        },
        outcome: "incorrect",
        mistake_class: "forgot_borrow",
        marks: [
          {
            id: "r0",
            correct: true,
          },
          {
            id: "c1",
            correct: true,
          },
          {
            id: "r1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 6, w kratce 4, potem 2",
          en: "Type 6, 4 in the small box, then 2",
        },
        value: {
          gaps: {
            r0: "6",
            c1: "4",
            r1: "2",
          },
        },
        outcome: "incorrect",
        mistake_class: "fact_error",
        marks: [
          {
            id: "r0",
            correct: false,
          },
          {
            id: "c1",
            correct: true,
          },
          {
            id: "r1",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "pyramid-up",
    label: "Number pyramid: a gap at the top and in the middle",
    showcase: true,
    question: {
      question_type: "pyramid",
      family: "slots",
      say: {
        pl: "Każda cegła to suma dwóch pod nią. Uzupełnij puste cegły.",
        en: "Each brick is the sum of the two below it. Fill in the empty bricks.",
      },
      data: {
        template: "",
        pyramid: [["{g1}"], ["{g2}", 9], [6, 5, 4]],
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["20"],
            near: {
              "2": "subtracted_for_sum",
            },
          },
          g2: {
            kind: "enter",
            accept: ["11"],
            near: {
              "1": "subtracted_for_sum",
              "29": "added_for_missing",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Zacznij od dołu. Pusta cegła w środku stoi na szóstce i piątce.",
            en: "Start at the bottom. The empty brick in the middle stands on the six and the five.",
          },
          focus: ["g2"],
        },
        boost: {
          text: {
            pl: "Każda cegła to suma dwóch cegieł, na których stoi. Znajdź te dwie cegły pod pustą i dodaj je.",
            en: "Each brick is the sum of the two bricks it stands on. Find the two bricks under the empty one and add them.",
          },
        },
        boost_by_mistake: {
          subtracted_for_sum: {
            text: {
              pl: "Cegła nad dwiema cegłami to ich suma. Dodaj je, nie odejmuj.",
              en: "A brick above two bricks is their sum. Add them, do not take away.",
            },
          },
        },
        worked: ["6 + 5 = 11", "11 + 9 = 20"],
        almost: ["6 + 5 = 11", "11 + 9 = □"],
      },
    },
    twin: {
      question_type: "pyramid",
      family: "slots",
      say: {
        pl: "Każda cegła to suma dwóch pod nią. Uzupełnij puste cegły.",
        en: "Each brick is the sum of the two below it. Fill in the empty bricks.",
      },
      data: {
        template: "",
        pyramid: [["{g1}"], ["{g2}", 8], [7, 3, 5]],
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["18"],
            near: {
              "2": "subtracted_for_sum",
            },
          },
          g2: {
            kind: "enter",
            accept: ["10"],
            near: {
              "4": "subtracted_for_sum",
              "26": "added_for_missing",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 20 i 11",
          en: "Type 20 and 11",
        },
        value: {
          gaps: {
            g1: "20",
            g2: "11",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 20 i 1 (odjęte zamiast dodane)",
          en: "Type 20 and 1 (subtracted instead of added)",
        },
        value: {
          gaps: {
            g1: "20",
            g2: "1",
          },
        },
        outcome: "incorrect",
        mistake_class: "subtracted_for_sum",
        marks: [
          {
            id: "g1",
            correct: true,
          },
          {
            id: "g2",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 21 i 11",
          en: "Type 21 and 11",
        },
        value: {
          gaps: {
            g1: "21",
            g2: "11",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "pyramid-down",
    label: "Number pyramid: gaps at the bottom, found by subtracting",
    question: {
      question_type: "pyramid",
      family: "slots",
      say: {
        pl: "Każda cegła to suma dwóch pod nią. Uzupełnij puste cegły.",
        en: "Each brick is the sum of the two below it. Fill in the empty bricks.",
      },
      data: {
        template: "",
        pyramid: [[15], [8, 7], ["{g1}", 5, "{g2}"]],
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["3"],
            near: {
              "13": "added_for_missing",
            },
          },
          g2: {
            kind: "enter",
            accept: ["2"],
            near: {
              "12": "added_for_missing",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Spójrz na ósemkę. Stoi na pustej cegle i na piątce.",
            en: "Look at the eight. It stands on the empty brick and on the five.",
          },
          focus: ["g1"],
        },
        boost: {
          text: {
            pl: "Cegła na górze to suma dwóch cegieł pod nią. Jedną z nich znasz. Brakującą znajdziesz odejmowaniem.",
            en: "A brick on top is the sum of the two bricks below it. You know one of them. Find the missing one by taking away.",
          },
        },
        boost_by_mistake: {
          added_for_missing: {
            text: {
              pl: "Cegła na górze to już suma. Żeby znaleźć brakującą cegłę pod spodem, odejmij.",
              en: "The brick on top is already the sum. To find the missing brick below it, take away.",
            },
          },
        },
        worked: ["8 − 5 = 3", "7 − 5 = 2"],
        almost: ["7 − 5 = 2", "8 − 5 = □"],
      },
    },
    twin: {
      question_type: "pyramid",
      family: "slots",
      say: {
        pl: "Każda cegła to suma dwóch pod nią. Uzupełnij puste cegły.",
        en: "Each brick is the sum of the two below it. Fill in the empty bricks.",
      },
      data: {
        template: "",
        pyramid: [[14], [9, 5], ["{g1}", 4, "{g2}"]],
        gaps: [
          {
            id: "g1",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
          {
            id: "g2",
            kind: "enter",
            input: "number",
            max_length: 3,
          },
        ],
      },
      key: {
        gaps: {
          g1: {
            kind: "enter",
            accept: ["5"],
            near: {
              "13": "added_for_missing",
            },
          },
          g2: {
            kind: "enter",
            accept: ["1"],
            near: {
              "9": "added_for_missing",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 3 i 2",
          en: "Type 3 and 2",
        },
        value: {
          gaps: {
            g1: "3",
            g2: "2",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 13 i 12 (dodane zamiast odjęte)",
          en: "Type 13 and 12 (added instead of subtracted)",
        },
        value: {
          gaps: {
            g1: "13",
            g2: "12",
          },
        },
        outcome: "incorrect",
        mistake_class: "added_for_missing",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 4 i 2",
          en: "Type 4 and 2",
        },
        value: {
          gaps: {
            g1: "4",
            g2: "2",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "g1",
            correct: false,
          },
          {
            id: "g2",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "half-past-seven",
    label: 'Read the clock in digits: half past seven, the "wpół do ósmej" trap',
    showcase: true,
    question: {
      question_type: "clock_read",
      family: "slots",
      say: {
        pl: "Która godzina jest na zegarze? Wpisz godziny i minuty.",
        en: "What time does the clock show? Write the hours and the minutes.",
      },
      data: {
        figure: {
          kind: "clock",
          h: 7,
          m: 30,
          alt: {
            pl: "Zegar ze wskazówkami.",
            en: "A clock with hands.",
          },
        },
        template: "{h} : {m}",
        gaps: [
          {
            id: "h",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 23],
          },
          {
            id: "m",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 59],
          },
        ],
      },
      key: {
        gaps: {
          h: {
            kind: "enter",
            accept: ["7", "19"],
            near: {
              "6": "hands_swapped",
              "8": "half_past_wrong_hour",
              "18": "hands_swapped",
              "20": "half_past_wrong_hour",
            },
          },
          m: {
            kind: "enter",
            accept: ["30"],
            near: {
              "6": "minute_hand_as_number",
              "35": "hands_swapped",
              "40": "hands_swapped",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Popatrz na obie wskazówki. Krótka pokazuje godzinę, a długa minuty.",
            en: "Look at both hands. The short one shows the hour, and the long one the minutes.",
          },
          focus: ["h"],
        },
        boost: {
          text: {
            pl: "Krótka wskazówka stoi między dwiema liczbami: godzina to mniejsza z nich. Przy długiej każda liczba na tarczy to 5 minut, więc licz piątkami od 12.",
            en: "The short hand stands between two numbers: the hour is the smaller one. For the long hand each number on the face is 5 minutes, so count in fives from 12.",
          },
        },
        boost_by_mistake: {
          half_past_wrong_hour: {
            text: {
              pl: "Krótka wskazówka nie doszła jeszcze do następnej liczby. Godzina to ta liczba, którą już minęła.",
              en: "The short hand has not reached the next number yet. The hour is the number it has already passed.",
            },
          },
          minute_hand_as_number: {
            text: {
              pl: "Długa wskazówka nie pokazuje minut wprost. Każda liczba to 5 minut: policz piątkami.",
              en: "The long hand does not show the minutes straight away. Each number is 5 minutes: count in fives.",
            },
          },
          hands_swapped: {
            text: {
              pl: "Krótka wskazówka mówi, która godzina. Długa mówi, ile minut.",
              en: "The short hand tells the hour. The long hand tells the minutes.",
            },
          },
        },
        almost: [
          {
            pl: "Krótka wskazówka jest między 7 a 8, więc godzina to 7.",
            en: "The short hand is between 7 and 8, so the hour is 7.",
          },
          {
            pl: "Długa wskazówka jest na 6: 5, 10, 15, 20, 25, □ minut.",
            en: "The long hand is on 6: 5, 10, 15, 20, 25, □ minutes.",
          },
        ],
        worked: [
          {
            pl: "Krótka wskazówka jest między 7 a 8: godzina 7",
            en: "The short hand is between 7 and 8: the hour is 7",
          },
          {
            pl: "Długa wskazówka jest na 6: 6 × 5 = 30 minut",
            en: "The long hand is on 6: 6 × 5 = 30 minutes",
          },
          {
            pl: "7 : 30, czyli wpół do ósmej",
            en: "7 : 30, half past seven",
          },
        ],
      },
    },
    twin: {
      question_type: "clock_read",
      family: "slots",
      say: {
        pl: "Która godzina jest na zegarze? Wpisz godziny i minuty.",
        en: "What time does the clock show? Write the hours and the minutes.",
      },
      data: {
        figure: {
          kind: "clock",
          h: 4,
          m: 30,
          alt: {
            pl: "Zegar ze wskazówkami.",
            en: "A clock with hands.",
          },
        },
        template: "{h} : {m}",
        gaps: [
          {
            id: "h",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 23],
          },
          {
            id: "m",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 59],
          },
        ],
      },
      key: {
        gaps: {
          h: {
            kind: "enter",
            accept: ["4", "16"],
            near: {
              "5": "half_past_wrong_hour",
              "6": "hands_swapped",
              "17": "half_past_wrong_hour",
              "18": "hands_swapped",
            },
          },
          m: {
            kind: "enter",
            accept: ["30"],
            near: {
              "6": "minute_hand_as_number",
              "20": "hands_swapped",
              "25": "hands_swapped",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 7 i 30, potem {check}",
          en: "Type 7 and 30, then {check}",
        },
        value: {
          gaps: {
            h: "7",
            m: "30",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 8 i 30 (wpół do ósmej, więc ósma?)",
          en: "Type 8 and 30 (the Polish name says eight)",
        },
        value: {
          gaps: {
            h: "8",
            m: "30",
          },
        },
        outcome: "incorrect",
        mistake_class: "half_past_wrong_hour",
        marks: [
          {
            id: "h",
            correct: false,
          },
          {
            id: "m",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 7 i 6 (liczba, na którą pokazuje długa wskazówka)",
          en: "Type 7 and 6 (the number the long hand points at)",
        },
        value: {
          gaps: {
            h: "7",
            m: "6",
          },
        },
        outcome: "incorrect",
        mistake_class: "minute_hand_as_number",
        marks: [
          {
            id: "h",
            correct: true,
          },
          {
            id: "m",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 6 i 35 (wskazówki zamienione)",
          en: "Type 6 and 35 (the hands swapped)",
        },
        value: {
          gaps: {
            h: "6",
            m: "35",
          },
        },
        outcome: "incorrect",
        mistake_class: "hands_swapped",
        marks: [
          {
            id: "h",
            correct: false,
          },
          {
            id: "m",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 19 i 30 (ta sama godzina wieczorem)",
          en: "Type 19 and 30 (the same time in the evening)",
        },
        value: {
          gaps: {
            h: "19",
            m: "30",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
    ],
  },
  {
    id: "purse",
    label: "Count a purse of złote and grosze",
    showcase: true,
    question: {
      question_type: "money_count",
      family: "slots",
      say: {
        pl: "Ile pieniędzy jest w portfelu?",
        en: "How much money is in the purse?",
      },
      data: {
        figure: {
          kind: "coins",
          items: ["zl2", "zl1", "gr50", "gr20"],
          alt: {
            pl: "Portfel: moneta 2 zł, moneta 1 zł, moneta 50 gr i moneta 20 gr.",
            en: "A purse: a 2 zł coin, a 1 zł coin, a 50 gr coin and a 20 gr coin.",
          },
        },
        template: "{zl} zł {gr} gr",
        gaps: [
          {
            id: "zl",
            kind: "enter",
            input: "number",
          },
          {
            id: "gr",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 99],
          },
        ],
      },
      key: {
        gaps: {
          zl: {
            kind: "enter",
            accept: ["3"],
            near: {
              "4": "counted_coins_not_value",
            },
          },
          gr: {
            kind: "enter",
            accept: ["70"],
            near: {
              "4": "counted_coins_not_value",
            },
          },
        },
      },
      help: {
        look: {
          text: {
            pl: "Policz osobno złote i osobno grosze. Na każdej monecie jest napisane, ile jest warta.",
            en: "Count the złoty and the grosze apart. Each coin says what it is worth.",
          },
          focus: ["zl"],
        },
        boost: {
          text: {
            pl: "Dodaj osobno złote: 2 zł i 1 zł. I osobno grosze: 50 gr i 20 gr.",
            en: "Add the złoty on their own: 2 zł and 1 zł. And the grosze on their own: 50 gr and 20 gr.",
          },
        },
        boost_by_mistake: {
          counted_coins_not_value: {
            text: {
              pl: "To jest liczba monet. Pieniądze liczymy po wartości: dodaj liczby napisane na monetach.",
              en: "That is how many coins there are. Money counts by value: add the numbers written on the coins.",
            },
          },
        },
        worked: [
          "2 zł + 1 zł = 3 zł",
          "50 gr + 20 gr = 70 gr",
          {
            pl: "Razem: 3 zł 70 gr",
            en: "In all: 3 zł 70 gr",
          },
        ],
      },
    },
    twin: {
      question_type: "money_count",
      family: "slots",
      say: {
        pl: "Ile pieniędzy jest w portfelu?",
        en: "How much money is in the purse?",
      },
      data: {
        figure: {
          kind: "coins",
          items: ["zl5", "gr20", "gr20", "gr10"],
          alt: {
            pl: "Portfel: moneta 5 zł, dwie monety po 20 gr i moneta 10 gr.",
            en: "A purse: a 5 zł coin, two 20 gr coins and a 10 gr coin.",
          },
        },
        template: "{zl} zł {gr} gr",
        gaps: [
          {
            id: "zl",
            kind: "enter",
            input: "number",
          },
          {
            id: "gr",
            kind: "enter",
            input: "number",
            max_length: 2,
            range: [0, 99],
          },
        ],
      },
      key: {
        gaps: {
          zl: {
            kind: "enter",
            accept: ["5"],
            near: {
              "4": "counted_coins_not_value",
            },
          },
          gr: {
            kind: "enter",
            accept: ["50"],
            near: {
              "4": "counted_coins_not_value",
            },
          },
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Wpisz 3 zł i 70 gr",
          en: "Type 3 zł and 70 gr",
        },
        value: {
          gaps: {
            zl: "3",
            gr: "70",
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wpisz 4 i 4 (policzone monety)",
          en: "Type 4 and 4 (the coins counted)",
        },
        value: {
          gaps: {
            zl: "4",
            gr: "4",
          },
        },
        outcome: "incorrect",
        mistake_class: "counted_coins_not_value",
        marks: [
          {
            id: "zl",
            correct: false,
          },
          {
            id: "gr",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Wpisz 2 zł i 70 gr",
          en: "Type 2 zł and 70 gr",
        },
        value: {
          gaps: {
            zl: "2",
            gr: "70",
          },
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [
          {
            id: "zl",
            correct: false,
          },
          {
            id: "gr",
            correct: true,
          },
        ],
      },
    ],
  },
];
