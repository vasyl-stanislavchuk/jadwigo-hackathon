// The place family's written examples: 1 or 2 per question type, chosen to show what the type can
// do (dl-5ssh.34.6). Ported from david-learns frontend/src/playground/examples. Each scenario carries
// the page's marks, written once with the playground's judge before the port, so every state shows
// from this data and nothing here is judged. A new scenario's marks are written by hand.
import type { WrittenExample } from "./types.ts";

export const PLACE_EXAMPLES: WrittenExample[] = [
  {
    id: "eight-in-twos",
    label:
      "Place on the number line: 8 on a line from 0 to 20 that counts in twos, three named near misses",
    showcase: true,
    question: {
      question_type: "number_line_place",
      family: "place",
      say: {
        pl: "Gdzie na osi jest liczba osiem? Przesuń znacznik.",
        en: "Where is eight on the line? Move the marker.",
      },
      data: {
        surface: "number_line",
        min: 0,
        max: 20,
        step: 2,
        labelled: [0, 10, 20],
        target_label: 8,
      },
      key: {
        surface: "number_line",
        value: 8,
        tolerance: 0,
        rule: {
          rule: "number_line",
          mode: "place",
          min: 0,
          max: 20,
          step: 2,
        },
      },
      help: {
        look: {
          text: {
            pl: "Kreski na tej osi idą co dwa. Podpisane są tylko 0, 10 i 20.",
            en: "The ticks on this line go up in twos. Only 0, 10 and 20 are written.",
          },
        },
        boost: {
          text: {
            pl: "Skacz od zera po dwa: 2, 4, 6… Zatrzymaj się na liczbie z zadania.",
            en: "Jump from zero in twos: 2, 4, 6… Stop on the number in the task.",
          },
        },
        boost_by_mistake: {
          off_by_tick: {
            text: {
              pl: "Blisko. Przeskocz po dwa jeszcze raz, palcem, od zera.",
              en: "Close. Jump in twos again, with your finger, from zero.",
            },
          },
          scale_misread: {
            text: {
              pl: "Jedna kreska to dwa, a nie jeden. Licz dwójkami, nie kreskami.",
              en: "One tick is two, not one. Count in twos, not in ticks.",
            },
          },
          wrong_direction: {
            text: {
              pl: "Liczby rosną w prawo. Zacznij od zera, z lewej strony.",
              en: "The numbers grow to the right. Start from zero, on the left.",
            },
          },
        },
        almost: [
          {
            pl: "Każda kreska to 2: 0, 2, 4, 6, 8.",
            en: "Each tick is 2: 0, 2, 4, 6, 8.",
          },
          {
            pl: "Osiem to □ skoki od zera.",
            en: "Eight is □ jumps from zero.",
          },
        ],
        worked: [
          {
            pl: "Każda kreska to 2: 0, 2, 4, 6, 8.",
            en: "Each tick is 2: 0, 2, 4, 6, 8.",
          },
          {
            pl: "Osiem to 4 skoki od zera, o jeden skok przed 10.",
            en: "Eight is 4 jumps from zero, one jump before 10.",
          },
        ],
      },
    },
    twin: {
      question_type: "number_line_place",
      family: "place",
      say: {
        pl: "Gdzie na osi jest liczba czternaście? Przesuń znacznik.",
        en: "Where is fourteen on the line? Move the marker.",
      },
      data: {
        surface: "number_line",
        min: 0,
        max: 20,
        step: 2,
        labelled: [0, 10, 20],
        target_label: 14,
      },
      key: {
        surface: "number_line",
        value: 14,
        tolerance: 0,
        rule: {
          rule: "number_line",
          mode: "place",
          min: 0,
          max: 20,
          step: 2,
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Postaw znacznik na 8, potem {check}",
          en: "Put the marker on 8, then {check}",
        },
        value: {
          at: 8,
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Postaw go na 10 (o jedną kreskę za daleko)",
          en: "Put it on 10 (one tick too far)",
        },
        value: {
          at: 10,
        },
        outcome: "incorrect",
        mistake_class: "off_by_tick",
        marks: [],
      },
      {
        try: {
          pl: "Policz 8 kresek od zera (kreski liczone jak jedynki, wychodzi 16)",
          en: "Count 8 ticks from zero (ticks counted as ones, which lands on 16)",
        },
        value: {
          at: 16,
        },
        outcome: "incorrect",
        mistake_class: "scale_misread",
        marks: [],
      },
      {
        try: {
          pl: "Policz od prawej: 4 skoki od 20 (wychodzi 12)",
          en: "Count from the right: 4 jumps from 20 (which lands on 12)",
        },
        value: {
          at: 12,
        },
        outcome: "incorrect",
        mistake_class: "wrong_direction",
        marks: [],
      },
      {
        try: {
          pl: "Postaw go na 4",
          en: "Put it on 4",
        },
        value: {
          at: 4,
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "place-quarters",
    label: "Place three quarters on a line cut into quarters",
    question: {
      question_type: "number_line_place",
      family: "place",
      say: {
        pl: "Gdzie na linii są trzy czwarte? Przesuń znacznik.",
        en: "Where is three quarters on the line? Move the marker.",
      },
      data: {
        surface: "number_line",
        min: 0,
        max: 1,
        step: 0.25,
        labelled: [0, 0.5, 1],
        tick_label: "fraction",
        target_label: "$\\frac{3}{4}$",
      },
      key: {
        surface: "number_line",
        value: 0.75,
        tolerance: 0,
        rule: {
          rule: "number_line",
          mode: "place",
          min: 0,
          max: 1,
          step: 0.25,
        },
      },
      help: {
        look: {
          text: {
            pl: "Między 0 a 1 są cztery równe skoki. Jeden skok to jedna czwarta.",
            en: "Between 0 and 1 there are four equal jumps. One jump is one quarter.",
          },
        },
        boost: {
          text: {
            pl: "Jedna druga to dwa skoki. Ile skoków to trzy czwarte?",
            en: "One half is two jumps. How many jumps is three quarters?",
          },
        },
        boost_by_mistake: {
          off_by_tick: {
            text: {
              pl: "Blisko. Policz skoki od zera jeszcze raz, palcem: jeden, dwa, trzy.",
              en: "Close. Count the jumps from zero again, with your finger: one, two, three.",
            },
          },
          wrong_direction: {
            text: {
              pl: "Licz od zera, z lewej strony. Trzy czwarte jest blisko jedynki.",
              en: "Count from zero, on the left. Three quarters is close to one.",
            },
          },
        },
        worked: [
          {
            pl: "Jedynkę podzielono na 4 skoki",
            en: "One is cut into 4 jumps",
          },
          {
            pl: "Trzy czwarte to 3 skoki od zera",
            en: "Three quarters is 3 jumps from zero",
          },
          {
            pl: "Znacznik staje o jeden skok przed jedynką",
            en: "The marker lands one jump before one",
          },
        ],
      },
    },
    twin: {
      question_type: "number_line_place",
      family: "place",
      say: {
        pl: "Gdzie na linii jest jedna czwarta? Przesuń znacznik.",
        en: "Where is one quarter on the line? Move the marker.",
      },
      data: {
        surface: "number_line",
        min: 0,
        max: 1,
        step: 0.25,
        labelled: [0, 0.5, 1],
        tick_label: "fraction",
        target_label: "$\\frac{1}{4}$",
      },
      key: {
        surface: "number_line",
        value: 0.25,
        tolerance: 0,
        rule: {
          rule: "number_line",
          mode: "place",
          min: 0,
          max: 1,
          step: 0.25,
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Postaw znacznik na trzech czwartych, potem {check}",
          en: "Put the marker on three quarters, then {check}",
        },
        value: {
          at: 0.75,
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Postaw go na jednej drugiej (o jedną kreskę za mało)",
          en: "Put it on one half (one tick short)",
        },
        value: {
          at: 0.5,
        },
        outcome: "incorrect",
        mistake_class: "off_by_tick",
        marks: [],
      },
      {
        try: {
          pl: "Postaw go na całej jedynce (sąsiednia liczba całkowita)",
          en: "Put it on the whole number 1 (the whole-number neighbour)",
        },
        value: {
          at: 1,
        },
        outcome: "incorrect",
        mistake_class: "off_by_tick",
        marks: [],
      },
      {
        try: {
          pl: "Policz trzy kreski od prawej",
          en: "Count three ticks from the right",
        },
        value: {
          at: 0.25,
        },
        outcome: "incorrect",
        mistake_class: "wrong_direction",
        marks: [],
      },
    ],
  },
  {
    id: "all-the-triangles",
    label: "Tap every triangle among eight shapes, turned different ways",
    showcase: true,
    question: {
      question_type: "hotspot",
      family: "place",
      say: {
        pl: "Dotknij wszystkich trójkątów.",
        en: "Tap every triangle.",
      },
      data: {
        surface: "image",
        image:
          "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20200%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Cpolygon%20points%3D%22120%2C85%20185%2C85%20120%2C20%22%2F%3E%3Cpolygon%20points%3D%22210%2C82%20290%2C82%20268%2C28%20232%2C28%22%2F%3E%3Cpolygon%20points%3D%22315%2C20%20385%2C20%20350%2C82%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%22150%22%20r%3D%2232%22%2F%3E%3Cpolygon%20points%3D%22112%2C182%20190%2C165%20135%2C115%22%2F%3E%3Cpolygon%20points%3D%22250%2C110%20282%2C145%20250%2C190%20218%2C145%22%2F%3E%3Cpolygon%20points%3D%22310%2C185%20390%2C185%20350%2C115%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E",
        image_alt: {
          pl: "Osiem figur w dwóch rzędach",
          en: "Eight shapes in two rows",
        },
        taps: 6,
      },
      key: {
        surface: "image",
        targets: [
          {
            id: "right",
            polygon: [
              {
                x: 0.26,
                y: 0.03,
              },
              {
                x: 0.49,
                y: 0.03,
              },
              {
                x: 0.49,
                y: 0.47,
              },
              {
                x: 0.26,
                y: 0.47,
              },
            ],
          },
          {
            id: "upside_down",
            polygon: [
              {
                x: 0.76,
                y: 0.03,
              },
              {
                x: 0.99,
                y: 0.03,
              },
              {
                x: 0.99,
                y: 0.47,
              },
              {
                x: 0.76,
                y: 0.47,
              },
            ],
          },
          {
            id: "thin",
            polygon: [
              {
                x: 0.26,
                y: 0.53,
              },
              {
                x: 0.49,
                y: 0.53,
              },
              {
                x: 0.49,
                y: 0.97,
              },
              {
                x: 0.26,
                y: 0.97,
              },
            ],
          },
          {
            id: "standing",
            polygon: [
              {
                x: 0.76,
                y: 0.53,
              },
              {
                x: 0.99,
                y: 0.53,
              },
              {
                x: 0.99,
                y: 0.97,
              },
              {
                x: 0.76,
                y: 0.97,
              },
            ],
          },
        ],
        near: [
          {
            id: "trapezoid",
            polygon: [
              {
                x: 0.51,
                y: 0.03,
              },
              {
                x: 0.74,
                y: 0.03,
              },
              {
                x: 0.74,
                y: 0.47,
              },
              {
                x: 0.51,
                y: 0.47,
              },
            ],
            mistake_class: "confuses_shape",
          },
          {
            id: "kite",
            polygon: [
              {
                x: 0.51,
                y: 0.53,
              },
              {
                x: 0.74,
                y: 0.53,
              },
              {
                x: 0.74,
                y: 0.97,
              },
              {
                x: 0.51,
                y: 0.97,
              },
            ],
            mistake_class: "confuses_shape",
          },
        ],
        require_all: true,
      },
      help: {
        look: {
          text: {
            pl: "Trójkąt ma trzy boki. Może być obrócony w każdą stronę.",
            en: "A triangle has three sides. It can be turned any way.",
          },
        },
        boost: {
          text: {
            pl: "Idź po figurach po kolei i policz boki każdej. Trzy boki? To trójkąt.",
            en: "Go through the shapes one by one and count each one’s sides. Three sides? That is a triangle.",
          },
        },
        boost_by_mistake: {
          confuses_shape: {
            text: {
              pl: "Ta figura ma cztery boki. Trójkąt ma tylko trzy.",
              en: "That shape has four sides. A triangle has only three.",
            },
          },
          target_missed: {
            text: {
              pl: "Jest jeszcze jeden trójkąt. Szukaj takiego, który jest chudy albo przechylony.",
              en: "There is one more triangle. Look for one that is thin or tilted.",
            },
          },
        },
        worked: [
          {
            pl: "Kwadrat i dwie inne figury mają po 4 boki: to nie trójkąty.",
            en: "The square and two other shapes have 4 sides each: they are not triangles.",
          },
          {
            pl: "Koło nie ma boków.",
            en: "The circle has no sides.",
          },
          {
            pl: "W górnym rzędzie druga i czwarta figura mają po 3 boki.",
            en: "In the top row the second and fourth shapes have 3 sides.",
          },
          {
            pl: "W dolnym rzędzie też druga i czwarta: razem 4 trójkąty.",
            en: "In the bottom row the second and fourth too: 4 triangles in all.",
          },
        ],
      },
    },
    twin: {
      question_type: "hotspot",
      family: "place",
      say: {
        pl: "Dotknij wszystkich czworokątów.",
        en: "Tap every four-sided shape.",
      },
      data: {
        surface: "image",
        image:
          "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20200%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%20stroke-linejoin%3D%22round%22%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Cpolygon%20points%3D%22120%2C85%20185%2C85%20120%2C20%22%2F%3E%3Cpolygon%20points%3D%22210%2C82%20290%2C82%20268%2C28%20232%2C28%22%2F%3E%3Cpolygon%20points%3D%22315%2C20%20385%2C20%20350%2C82%22%2F%3E%3Ccircle%20cx%3D%2250%22%20cy%3D%22150%22%20r%3D%2232%22%2F%3E%3Cpolygon%20points%3D%22112%2C182%20190%2C165%20135%2C115%22%2F%3E%3Cpolygon%20points%3D%22250%2C110%20282%2C145%20250%2C190%20218%2C145%22%2F%3E%3Cpolygon%20points%3D%22310%2C185%20390%2C185%20350%2C115%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E",
        image_alt: {
          pl: "Osiem figur w dwóch rzędach",
          en: "Eight shapes in two rows",
        },
        taps: 6,
      },
      key: {
        surface: "image",
        targets: [
          {
            id: "square",
            polygon: [
              {
                x: 0.01,
                y: 0.03,
              },
              {
                x: 0.24,
                y: 0.03,
              },
              {
                x: 0.24,
                y: 0.47,
              },
              {
                x: 0.01,
                y: 0.47,
              },
            ],
          },
          {
            id: "trapezoid",
            polygon: [
              {
                x: 0.51,
                y: 0.03,
              },
              {
                x: 0.74,
                y: 0.03,
              },
              {
                x: 0.74,
                y: 0.47,
              },
              {
                x: 0.51,
                y: 0.47,
              },
            ],
          },
          {
            id: "kite",
            polygon: [
              {
                x: 0.51,
                y: 0.53,
              },
              {
                x: 0.74,
                y: 0.53,
              },
              {
                x: 0.74,
                y: 0.97,
              },
              {
                x: 0.51,
                y: 0.97,
              },
            ],
          },
        ],
        near: [
          {
            id: "standing",
            polygon: [
              {
                x: 0.76,
                y: 0.53,
              },
              {
                x: 0.99,
                y: 0.53,
              },
              {
                x: 0.99,
                y: 0.97,
              },
              {
                x: 0.76,
                y: 0.97,
              },
            ],
            mistake_class: "confuses_shape",
          },
        ],
        require_all: true,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij czterech trójkątów, potem {check}",
          en: "Tap the four triangles, then {check}",
        },
        value: {
          points: [
            {
              x: 0.375,
              y: 0.25,
            },
            {
              x: 0.875,
              y: 0.25,
            },
            {
              x: 0.375,
              y: 0.75,
            },
            {
              x: 0.875,
              y: 0.75,
            },
          ],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Trzy trójkąty i figura z czterema bokami u góry",
          en: "Three triangles and the four-sided shape at the top",
        },
        value: {
          points: [
            {
              x: 0.375,
              y: 0.25,
            },
            {
              x: 0.875,
              y: 0.25,
            },
            {
              x: 0.875,
              y: 0.75,
            },
            {
              x: 0.625,
              y: 0.25,
            },
          ],
        },
        outcome: "incorrect",
        mistake_class: "confuses_shape",
        marks: [
          {
            id: "t1",
            correct: true,
          },
          {
            id: "t2",
            correct: true,
          },
          {
            id: "t3",
            correct: true,
          },
          {
            id: "t4",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Tylko trzy trójkąty (pominięty chudy)",
          en: "Only three triangles (the thin one missed)",
        },
        value: {
          points: [
            {
              x: 0.375,
              y: 0.25,
            },
            {
              x: 0.875,
              y: 0.25,
            },
            {
              x: 0.875,
              y: 0.75,
            },
          ],
        },
        outcome: "incorrect",
        mistake_class: "target_missed",
        marks: [
          {
            id: "t1",
            correct: true,
          },
          {
            id: "t2",
            correct: true,
          },
          {
            id: "t3",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij koła",
          en: "Tap the circle",
        },
        value: {
          points: [
            {
              x: 0.125,
              y: 0.75,
            },
          ],
        },
        outcome: "incorrect",
        mistake_class: "missed_region",
        marks: [
          {
            id: "t1",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "find-the-square",
    label: "Tap the square among four shapes",
    question: {
      question_type: "hotspot",
      family: "place",
      say: {
        pl: "Dotknij kwadratu.",
        en: "Tap the square.",
      },
      data: {
        surface: "image",
        image:
          "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20100%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Crect%20x%3D%22120%22%20y%3D%2230%22%20width%3D%2280%22%20height%3D%2240%22%2F%3E%3Cpolygon%20points%3D%22270%2C20%20300%2C80%20240%2C80%22%2F%3E%3Ccircle%20cx%3D%22360%22%20cy%3D%2250%22%20r%3D%2230%22%2F%3E%3C%2Fsvg%3E",
        image_alt: {
          pl: "Kwadrat, prostokąt, trójkąt i koło",
          en: "A square, a rectangle, a triangle and a circle",
        },
        taps: 1,
      },
      key: {
        surface: "image",
        targets: [
          {
            id: "r1",
            polygon: [
              {
                x: 0.04,
                y: 0.15,
              },
              {
                x: 0.21,
                y: 0.15,
              },
              {
                x: 0.21,
                y: 0.85,
              },
              {
                x: 0.04,
                y: 0.85,
              },
            ],
          },
        ],
        near: [
          {
            id: "r2",
            polygon: [
              {
                x: 0.29,
                y: 0.25,
              },
              {
                x: 0.51,
                y: 0.25,
              },
              {
                x: 0.51,
                y: 0.75,
              },
              {
                x: 0.29,
                y: 0.75,
              },
            ],
            mistake_class: "rectangle_for_square",
          },
        ],
        require_all: true,
      },
      help: {
        look: {
          text: {
            pl: "Kwadrat ma cztery boki tej samej długości.",
            en: "A square has four sides, all the same length.",
          },
        },
        boost: {
          text: {
            pl: "Policz boki każdej figury. Potem sprawdź: czy wszystkie są równe?",
            en: "Count the sides of each shape. Then check: are they all the same length?",
          },
        },
        boost_by_mistake: {
          rectangle_for_square: {
            text: {
              pl: "Ta figura ma dwa boki długie i dwa krótkie. Kwadrat ma wszystkie równe.",
              en: "That shape has two long sides and two short ones. A square’s are all equal.",
            },
          },
        },
        worked: [
          {
            pl: "Koło nie ma boków.",
            en: "The circle has no sides.",
          },
          {
            pl: "Trójkąt ma 3 boki.",
            en: "The triangle has 3 sides.",
          },
          {
            pl: "Prostokąt ma 2 boki długie i 2 krótkie.",
            en: "The rectangle has 2 long sides and 2 short ones.",
          },
          {
            pl: "Kwadrat ma 4 równe boki: to pierwsza figura.",
            en: "The square has 4 equal sides: it is the first shape.",
          },
        ],
      },
    },
    twin: {
      question_type: "hotspot",
      family: "place",
      say: {
        pl: "Dotknij trójkąta.",
        en: "Tap the triangle.",
      },
      data: {
        surface: "image",
        image:
          "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20400%20100%22%20fill%3D%22none%22%20stroke%3D%22black%22%20stroke-width%3D%223%22%3E%3Crect%20x%3D%2220%22%20y%3D%2220%22%20width%3D%2260%22%20height%3D%2260%22%2F%3E%3Crect%20x%3D%22120%22%20y%3D%2230%22%20width%3D%2280%22%20height%3D%2240%22%2F%3E%3Cpolygon%20points%3D%22270%2C20%20300%2C80%20240%2C80%22%2F%3E%3Ccircle%20cx%3D%22360%22%20cy%3D%2250%22%20r%3D%2230%22%2F%3E%3C%2Fsvg%3E",
        image_alt: {
          pl: "Kwadrat, prostokąt, trójkąt i koło",
          en: "A square, a rectangle, a triangle and a circle",
        },
        taps: 1,
      },
      key: {
        surface: "image",
        targets: [
          {
            id: "r1",
            polygon: [
              {
                x: 0.58,
                y: 0.15,
              },
              {
                x: 0.77,
                y: 0.15,
              },
              {
                x: 0.77,
                y: 0.85,
              },
              {
                x: 0.58,
                y: 0.85,
              },
            ],
          },
        ],
        require_all: true,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Dotknij kwadratu",
          en: "Tap the square",
        },
        value: {
          points: [
            {
              x: 0.12,
              y: 0.5,
            },
          ],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Dotknij prostokąta",
          en: "Tap the rectangle",
        },
        value: {
          points: [
            {
              x: 0.4,
              y: 0.5,
            },
          ],
        },
        outcome: "incorrect",
        mistake_class: "rectangle_for_square",
        marks: [
          {
            id: "t1",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Dotknij koła",
          en: "Tap the circle",
        },
        value: {
          points: [
            {
              x: 0.9,
              y: 0.5,
            },
          ],
        },
        outcome: "incorrect",
        mistake_class: "missed_region",
        marks: [
          {
            id: "t1",
            correct: false,
          },
        ],
      },
    ],
  },
  {
    id: "build-four-by-six",
    label:
      "Build a rectangle: 4 × 6 on a grid of dots, either way round, a column short and 3 × 8 as misses",
    showcase: true,
    question: {
      question_type: "spatial_build",
      family: "place",
      say: {
        pl: "Zbuduj z kropek prostokąt do działania cztery razy sześć.",
        en: "Build a rectangle of dots for four times six.",
      },
      data: {
        surface: "grid",
        size: 10,
        label: "4 × 6",
      },
      key: {
        surface: "grid",
        rows: 4,
        cols: 6,
        either_order: true,
        off_by_one: true,
      },
      help: {
        look: {
          text: {
            pl: "Pierwsza liczba mówi, ile jest rzędów. Druga mówi, ile kropek jest w każdym rzędzie.",
            en: "The first number says how many rows. The second says how many dots are in each row.",
          },
        },
        boost: {
          text: {
            pl: "Zbuduj najpierw jeden rząd po 6 kropek. Potem dokładaj takie same rzędy, aż będą 4.",
            en: "Build one row of 6 dots first. Then add rows just like it until there are 4.",
          },
        },
        boost_by_mistake: {
          grid_off_by_one: {
            text: {
              pl: "Prawie. Policz jeszcze raz rzędy, a potem kropki w jednym rzędzie.",
              en: "Almost. Count the rows again, then the dots in one row.",
            },
          },
        },
        almost: [
          {
            pl: "4 × 6 to 4 rzędy po 6 kropek.",
            en: "4 × 6 is 4 rows of 6 dots.",
          },
          {
            pl: "Dotknij kropki w czwartym rzędzie i szóstej kolumnie.",
            en: "Tap the dot in the fourth row and the sixth column.",
          },
          {
            pl: "Razem 6 + 6 + 6 + 6 = □",
            en: "All together 6 + 6 + 6 + 6 = □",
          },
        ],
        worked: [
          {
            pl: "4 × 6 to 4 rzędy po 6 kropek.",
            en: "4 × 6 is 4 rows of 6 dots.",
          },
          {
            pl: "Dotknij kropki w czwartym rzędzie i szóstej kolumnie.",
            en: "Tap the dot in the fourth row and the sixth column.",
          },
          {
            pl: "Razem 6 + 6 + 6 + 6 = 24 kropki.",
            en: "All together 6 + 6 + 6 + 6 = 24 dots.",
          },
        ],
      },
    },
    twin: {
      question_type: "spatial_build",
      family: "place",
      say: {
        pl: "Zbuduj z kropek prostokąt do działania trzy razy siedem.",
        en: "Build a rectangle of dots for three times seven.",
      },
      data: {
        surface: "grid",
        size: 10,
        label: "3 × 7",
      },
      key: {
        surface: "grid",
        rows: 3,
        cols: 7,
        either_order: true,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zbuduj 4 rzędy po 6 kropek, potem {check}",
          en: "Build 4 rows of 6 dots, then {check}",
        },
        value: {
          rows: 4,
          cols: 6,
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zbuduj 6 rzędów po 4 kropki (obrócony, też dobrze), potem {check}",
          en: "Build 6 rows of 4 dots (turned round, also right), then {check}",
        },
        value: {
          rows: 6,
          cols: 4,
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zbuduj 4 rzędy po 5 kropek (o jedną kolumnę za mało)",
          en: "Build 4 rows of 5 dots (one column short)",
        },
        value: {
          rows: 4,
          cols: 5,
        },
        outcome: "incorrect",
        mistake_class: "grid_off_by_one",
        marks: [],
      },
      {
        try: {
          pl: "Zbuduj 3 rzędy po 8 kropek (też 24 kropki, ale inny prostokąt)",
          en: "Build 3 rows of 8 dots (24 dots too, but another rectangle)",
        },
        value: {
          rows: 3,
          cols: 8,
        },
        outcome: "incorrect",
        mistake_class: "other_wrong",
        marks: [],
      },
    ],
  },
  {
    id: "favourite-fruit",
    label:
      "Draw a graph: a bar graph from a class count, four fruits, an axis in twos, a bar one short as the near miss",
    showcase: true,
    question: {
      question_type: "draw_graph",
      family: "place",
      say: {
        pl: "Narysuj wykres słupkowy. Liczby są pod zadaniem.",
        en: "Draw the bar graph. The numbers are under the task.",
      },
      data: {
        surface: "bars",
        kind: "bar",
        categories: [
          {
            id: "apples",
            label: {
              pl: "jabłka",
              en: "apples",
            },
          },
          {
            id: "bananas",
            label: {
              pl: "banany",
              en: "bananas",
            },
          },
          {
            id: "cherries",
            label: {
              pl: "wiśnie",
              en: "cherries",
            },
          },
          {
            id: "grapes",
            label: {
              pl: "winogrona",
              en: "grapes",
            },
          },
        ],
        max: 12,
        step: 1,
        tick: 2,
        unit_label: {
          pl: "dzieci",
          en: "children",
        },
        stem: {
          text: {
            pl: "Klasa wybierała ulubiony owoc.\n\nJabłka: 6. Banany: 4. Wiśnie: 7. Winogrona: 2.",
            en: "The class chose a favourite fruit.\n\nApples: 6. Bananas: 4. Cherries: 7. Grapes: 2.",
          },
        },
      },
      key: {
        surface: "bars",
        heights: {
          apples: 6,
          bananas: 4,
          cherries: 7,
          grapes: 2,
        },
      },
      help: {
        look: {
          text: {
            pl: "Każdy słupek to jeden owoc. Wysokość słupka to liczba dzieci.",
            en: "Each bar is one fruit. The height of the bar is the number of children.",
          },
          focus: ["apples"],
        },
        boost: {
          text: {
            pl: "Oś po lewej liczy co dwa: 2, 4, 6. Kreska między 6 a 8 to 7.",
            en: "The axis on the left counts in twos: 2, 4, 6. The line between 6 and 8 is 7.",
          },
        },
        boost_by_mistake: {
          bar_off_by_step: {
            text: {
              pl: "Blisko. Policz kreski od zera jeszcze raz: ta oś liczy co dwa.",
              en: "Close. Count the lines from zero again: this axis counts in twos.",
            },
          },
          bar_wrong: {
            text: {
              pl: "Spójrz na liczbę przy owocu. Potem znajdź tę liczbę na osi po lewej.",
              en: "Look at the number next to the fruit. Then find that number on the axis on the left.",
            },
          },
        },
        give: ["apples"],
        worked: [
          {
            pl: "Jabłka: 6, słupek sięga kreski z liczbą 6",
            en: "Apples: 6, the bar reaches the line marked 6",
          },
          {
            pl: "Banany: 4, słupek sięga kreski z liczbą 4",
            en: "Bananas: 4, the bar reaches the line marked 4",
          },
          {
            pl: "Wiśnie: 7, słupek staje między 6 a 8",
            en: "Cherries: 7, the bar stops between 6 and 8",
          },
          {
            pl: "Winogrona: 2, najniższy słupek",
            en: "Grapes: 2, the lowest bar",
          },
        ],
        almost: [
          {
            pl: "Jabłka: 6, słupek sięga kreski z liczbą 6",
            en: "Apples: 6, the bar reaches the line marked 6",
          },
          {
            pl: "Banany: 4, słupek sięga kreski z liczbą 4",
            en: "Bananas: 4, the bar reaches the line marked 4",
          },
          {
            pl: "Wiśnie: 7, słupek staje między 6 a 8",
            en: "Cherries: 7, the bar stops between 6 and 8",
          },
          {
            pl: "Winogrona: najniższy słupek, sięga kreski □",
            en: "Grapes: the lowest bar, up to the line □",
          },
        ],
      },
    },
    twin: {
      question_type: "draw_graph",
      family: "place",
      say: {
        pl: "Narysuj wykres słupkowy. Liczby są pod zadaniem.",
        en: "Draw the bar graph. The numbers are under the task.",
      },
      data: {
        surface: "bars",
        kind: "bar",
        categories: [
          {
            id: "dogs",
            label: {
              pl: "psy",
              en: "dogs",
            },
          },
          {
            id: "cats",
            label: {
              pl: "koty",
              en: "cats",
            },
          },
          {
            id: "fish",
            label: {
              pl: "rybki",
              en: "fish",
            },
          },
        ],
        max: 10,
        step: 1,
        tick: 2,
        unit_label: {
          pl: "dzieci",
          en: "children",
        },
        stem: {
          text: {
            pl: "Ulubione zwierzęta w klasie.\n\nPsy: 8. Koty: 5. Rybki: 3.",
            en: "Favourite animals in the class.\n\nDogs: 8. Cats: 5. Fish: 3.",
          },
        },
      },
      key: {
        surface: "bars",
        heights: {
          dogs: 8,
          cats: 5,
          fish: 3,
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Podnieś słupki do 6, 4, 7 i 2, potem {check}",
          en: "Raise the bars to 6, 4, 7 and 2, then {check}",
        },
        value: {
          heights: {
            apples: 6,
            bananas: 4,
            cherries: 7,
            grapes: 2,
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Wiśnie na 6 (o jeden za mało)",
          en: "Cherries at 6 (one short)",
        },
        value: {
          heights: {
            apples: 6,
            bananas: 4,
            cherries: 6,
            grapes: 2,
          },
        },
        outcome: "incorrect",
        mistake_class: "bar_off_by_step",
        marks: [
          {
            id: "apples",
            correct: true,
          },
          {
            id: "bananas",
            correct: true,
          },
          {
            id: "cherries",
            correct: false,
          },
          {
            id: "grapes",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Banany na 8 (odczytane z osi co dwa jak co jeden)",
          en: "Bananas at 8 (the axis in twos read as ones)",
        },
        value: {
          heights: {
            apples: 6,
            bananas: 8,
            cherries: 7,
            grapes: 2,
          },
        },
        outcome: "incorrect",
        mistake_class: "bar_wrong",
        marks: [
          {
            id: "apples",
            correct: true,
          },
          {
            id: "bananas",
            correct: false,
          },
          {
            id: "cherries",
            correct: true,
          },
          {
            id: "grapes",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "temperature-line",
    label: "A line graph: the noon temperature over a school week, an axis in twos",
    question: {
      question_type: "draw_graph",
      family: "place",
      say: {
        pl: "Narysuj wykres liniowy. Temperatury są pod zadaniem.",
        en: "Draw the line graph. The temperatures are under the task.",
      },
      data: {
        surface: "bars",
        kind: "line",
        categories: [
          {
            id: "mon",
            label: {
              pl: "pon.",
              en: "Mon",
            },
          },
          {
            id: "tue",
            label: {
              pl: "wt.",
              en: "Tue",
            },
          },
          {
            id: "wed",
            label: {
              pl: "śr.",
              en: "Wed",
            },
          },
          {
            id: "thu",
            label: {
              pl: "czw.",
              en: "Thu",
            },
          },
          {
            id: "fri",
            label: {
              pl: "pt.",
              en: "Fri",
            },
          },
        ],
        max: 16,
        step: 1,
        tick: 2,
        unit_label: "°C",
        category_label: {
          pl: "dzień",
          en: "day",
        },
        stem: {
          text: {
            pl: "Temperatura w południe w tym tygodniu.\n\nPoniedziałek: 12 °C. Wtorek: 14 °C. Środa: 15 °C. Czwartek: 11 °C. Piątek: 8 °C.",
            en: "The temperature at noon this week.\n\nMonday: 12 °C. Tuesday: 14 °C. Wednesday: 15 °C. Thursday: 11 °C. Friday: 8 °C.",
          },
        },
      },
      key: {
        surface: "bars",
        heights: {
          mon: 12,
          tue: 14,
          wed: 15,
          thu: 11,
          fri: 8,
        },
      },
      help: {
        look: {
          text: {
            pl: "Każdy dzień to jeden punkt. Im cieplej, tym wyżej stoi punkt.",
            en: "Each day is one point. The warmer it is, the higher the point.",
          },
          focus: ["mon"],
        },
        boost: {
          text: {
            pl: "Oś po lewej liczy co dwa: 10, 12, 14. Kreska między 14 a 16 to 15.",
            en: "The axis on the left counts in twos: 10, 12, 14. The line between 14 and 16 is 15.",
          },
        },
        boost_by_mistake: {
          bar_off_by_step: {
            text: {
              pl: "Blisko. Policz kreski od 10 w górę jeszcze raz.",
              en: "Close. Count the lines up from 10 again.",
            },
          },
          bar_wrong: {
            text: {
              pl: "Sprawdź, czy każdy punkt stoi nad swoim dniem. Idź po dniach po kolei.",
              en: "Check that each point sits above its own day. Go through the days in order.",
            },
          },
        },
        give: ["mon"],
        worked: [
          {
            pl: "Poniedziałek: 12, punkt na kresce 12",
            en: "Monday: 12, the point on the line marked 12",
          },
          {
            pl: "Wtorek: 14, punkt na kresce 14",
            en: "Tuesday: 14, the point on the line marked 14",
          },
          {
            pl: "Środa: 15, punkt między 14 a 16",
            en: "Wednesday: 15, the point between 14 and 16",
          },
          {
            pl: "Czwartek: 11, punkt między 10 a 12",
            en: "Thursday: 11, the point between 10 and 12",
          },
          {
            pl: "Piątek: 8, punkt na kresce 8. Linia łączy punkty po kolei.",
            en: "Friday: 8, the point on the line marked 8. The line joins the points in order.",
          },
        ],
      },
    },
    twin: {
      question_type: "draw_graph",
      family: "place",
      say: {
        pl: "Narysuj wykres liniowy. Wysokości są pod zadaniem.",
        en: "Draw the line graph. The heights are under the task.",
      },
      data: {
        surface: "bars",
        kind: "line",
        categories: [
          {
            id: "w1",
            label: {
              pl: "1. tydz.",
              en: "week 1",
            },
          },
          {
            id: "w2",
            label: {
              pl: "2. tydz.",
              en: "week 2",
            },
          },
          {
            id: "w3",
            label: {
              pl: "3. tydz.",
              en: "week 3",
            },
          },
          {
            id: "w4",
            label: {
              pl: "4. tydz.",
              en: "week 4",
            },
          },
        ],
        max: 14,
        step: 1,
        tick: 2,
        unit_label: "cm",
        stem: {
          text: {
            pl: "Fasola w doniczce rośnie. Po 1. tygodniu ma 2 cm, po 2. tygodniu 5 cm, po 3. tygodniu 9 cm, po 4. tygodniu 12 cm.",
            en: "A bean grows in a pot. After week 1 it is 2 cm tall, after week 2 5 cm, after week 3 9 cm, after week 4 12 cm.",
          },
        },
      },
      key: {
        surface: "bars",
        heights: {
          w1: 2,
          w2: 5,
          w3: 9,
          w4: 12,
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Postaw punkty na 12, 14, 15, 11 i 8, potem {check}",
          en: "Put the points at 12, 14, 15, 11 and 8, then {check}",
        },
        value: {
          heights: {
            mon: 12,
            tue: 14,
            wed: 15,
            thu: 11,
            fri: 8,
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Środa na 14 (o jeden za nisko)",
          en: "Wednesday at 14 (one too low)",
        },
        value: {
          heights: {
            mon: 12,
            tue: 14,
            wed: 14,
            thu: 11,
            fri: 8,
          },
        },
        outcome: "incorrect",
        mistake_class: "bar_off_by_step",
        marks: [
          {
            id: "mon",
            correct: true,
          },
          {
            id: "tue",
            correct: true,
          },
          {
            id: "wed",
            correct: false,
          },
          {
            id: "thu",
            correct: true,
          },
          {
            id: "fri",
            correct: true,
          },
        ],
      },
      {
        try: {
          pl: "Środa i czwartek zamienione miejscami",
          en: "Wednesday and Thursday swapped",
        },
        value: {
          heights: {
            mon: 12,
            tue: 14,
            wed: 11,
            thu: 15,
            fri: 8,
          },
        },
        outcome: "incorrect",
        mistake_class: "bar_wrong",
        marks: [
          {
            id: "mon",
            correct: true,
          },
          {
            id: "tue",
            correct: true,
          },
          {
            id: "wed",
            correct: false,
          },
          {
            id: "thu",
            correct: false,
          },
          {
            id: "fri",
            correct: true,
          },
        ],
      },
    ],
  },
  {
    id: "set-half-past-seven",
    label: 'Set the clock to "wpół do ósmej", geared hands',
    showcase: true,
    question: {
      question_type: "clock_set",
      family: "place",
      say: {
        pl: "Ustaw zegar na wpół do ósmej.",
        en: "Set the clock to half past seven.",
      },
      data: {
        surface: "clock",
        target_label: {
          pl: "wpół do ósmej",
          en: "half past seven",
        },
        minute_step: 5,
        hands: "geared",
      },
      key: {
        surface: "clock",
        h: 7,
        m: 30,
      },
      help: {
        look: {
          text: {
            pl: "Zacznij od długiej wskazówki. Pół godziny to pół obrotu: gdzie wtedy stoi?",
            en: "Start with the long hand. Half an hour is half a turn: where does it stand then?",
          },
          focus: ["m"],
        },
        boost: {
          text: {
            pl: "„Wpół do ósmej” znaczy: do ósmej zostało jeszcze pół godziny. Siódma już minęła, ósma jeszcze nie przyszła.",
            en: '"Half past seven" means half an hour after seven. Seven has gone by, and eight has not come yet.',
          },
        },
        boost_by_mistake: {
          half_past_wrong_hour: {
            text: {
              pl: "„Wpół do ósmej” to jeszcze nie ósma. Krótka wskazówka nie doszła do 8.",
              en: "Half past seven is not eight yet. The short hand has not reached 8.",
            },
          },
          hands_swapped: {
            text: {
              pl: "Krótka wskazówka pokazuje godzinę, długa minuty. Zamień je miejscami.",
              en: "The short hand shows the hour, the long hand the minutes. Swap them round.",
            },
          },
        },
        almost: [
          {
            pl: "Długa wskazówka: pół obrotu od 12, czyli na 6.",
            en: "The long hand: half a turn from 12, so on 6.",
          },
          {
            pl: "Krótka wskazówka: w połowie drogi między 7 a □.",
            en: "The short hand: half way between 7 and □.",
          },
        ],
        worked: [
          {
            pl: "Wpół do ósmej to 7 : 30",
            en: "Half past seven is 7 : 30",
          },
          {
            pl: "Długa wskazówka na 6: 30 minut",
            en: "The long hand on 6: 30 minutes",
          },
          {
            pl: "Krótka wskazówka w połowie drogi między 7 a 8",
            en: "The short hand half way between 7 and 8",
          },
        ],
      },
    },
    twin: {
      question_type: "clock_set",
      family: "place",
      say: {
        pl: "Ustaw zegar na wpół do trzeciej.",
        en: "Set the clock to half past two.",
      },
      data: {
        surface: "clock",
        target_label: {
          pl: "wpół do trzeciej",
          en: "half past two",
        },
        minute_step: 5,
        hands: "geared",
      },
      key: {
        surface: "clock",
        h: 2,
        m: 30,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Krótka wskazówka między 7 a 8, długa na 6, potem {check}",
          en: "Short hand between 7 and 8, long hand on 6, then {check}",
        },
        value: {
          hour_at: 37.5,
          m: 30,
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Krótka wskazówka między 8 a 9, długa na 6 (bo „ósmej”)",
          en: "Short hand between 8 and 9, long hand on 6 (the Polish name says eight)",
        },
        value: {
          hour_at: 42.5,
          m: 30,
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
          pl: "Długa wskazówka na 7, krótka koło 6 (wskazówki zamienione)",
          en: "Long hand on 7, short hand near 6 (the hands swapped)",
        },
        value: {
          hour_at: 32.916666666666664,
          m: 35,
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
          pl: "Równo siódma: krótka na 7, długa na 12",
          en: "Seven o’clock: short hand on 7, long hand on 12",
        },
        value: {
          hour_at: 35,
          m: 0,
        },
        outcome: "incorrect",
        mistake_class: "wrong_hour",
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
    ],
  },
  {
    id: "pay-exact",
    label: "Pay exactly 3 zł 50 gr: any coins that make it are right",
    showcase: true,
    question: {
      question_type: "money_pay",
      family: "place",
      say: {
        pl: "Zapłać dokładnie trzy złote pięćdziesiąt groszy.",
        en: "Pay exactly three złoty fifty grosze.",
      },
      data: {
        surface: "coins",
        bank: ["gr10", "gr20", "gr50", "zl1", "zl2", "zl5"],
        amount_label: "3 zł 50 gr",
        slots: 8,
        total: "hidden",
      },
      key: {
        surface: "coins",
        amount_gr: 350,
      },
      help: {
        look: {
          text: {
            pl: "Najpierw zapłać złote, potem grosze.",
            en: "Pay the złoty first, then the grosze.",
          },
        },
        boost: {
          text: {
            pl: "Połóż monety, które razem dają 3 zł. Potem dołóż monetę 50 gr.",
            en: "Put in coins that make 3 zł together. Then add a 50 gr coin.",
          },
        },
        boost_by_mistake: {
          one_coin_off: {
            text: {
              pl: "Prawie! Brakuje jednej monety albo jedna jest za dużo. Policz tackę jeszcze raz.",
              en: "Nearly! One coin is missing or one too many. Count the tray again.",
            },
          },
          too_much: {
            text: {
              pl: "Na tacce jest więcej, niż trzeba zapłacić. Zabierz monetę i policz jeszcze raz.",
              en: "There is more in the tray than you need to pay. Take a coin back and count again.",
            },
          },
        },
        worked: [
          "2 zł + 1 zł = 3 zł",
          "3 zł + 50 gr = 3 zł 50 gr",
          {
            pl: "Na tacce: 2 zł, 1 zł i 50 gr",
            en: "In the tray: 2 zł, 1 zł and 50 gr",
          },
        ],
      },
    },
    twin: {
      question_type: "money_pay",
      family: "place",
      say: {
        pl: "Zapłać dokładnie dwa złote siedemdziesiąt groszy.",
        en: "Pay exactly two złoty seventy grosze.",
      },
      data: {
        surface: "coins",
        bank: ["gr10", "gr20", "gr50", "zl1", "zl2", "zl5"],
        amount_label: "2 zł 70 gr",
        slots: 8,
        total: "hidden",
      },
      key: {
        surface: "coins",
        amount_gr: 270,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Połóż 2 zł, 1 zł i 50 gr, potem {check}",
          en: "Put in 2 zł, 1 zł and 50 gr, then {check}",
        },
        value: {
          items: ["zl2", "zl1", "gr50"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Połóż trzy razy 1 zł i 50 gr (też dobrze)",
          en: "Put in 1 zł three times and 50 gr (also right)",
        },
        value: {
          items: ["zl1", "zl1", "zl1", "gr50"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Połóż tylko 2 zł i 1 zł",
          en: "Put in only 2 zł and 1 zł",
        },
        value: {
          items: ["zl2", "zl1"],
        },
        outcome: "incorrect",
        mistake_class: "one_coin_off",
        marks: [],
      },
      {
        try: {
          pl: "Połóż 5 zł",
          en: "Put in 5 zł",
        },
        value: {
          items: ["zl5"],
        },
        outcome: "incorrect",
        mistake_class: "too_much",
        marks: [],
      },
    ],
  },
  {
    id: "pay-fewest",
    label: "Pay 4 zł with the fewest coins",
    question: {
      question_type: "money_pay",
      family: "place",
      say: {
        pl: "Zapłać cztery złote jak najmniejszą liczbą monet.",
        en: "Pay four złoty with as few coins as you can.",
      },
      data: {
        surface: "coins",
        bank: ["gr2", "gr50", "zl1", "zl2", "zl5"],
        amount_label: "4 zł",
        slots: 8,
        total: "hidden",
      },
      key: {
        surface: "coins",
        amount_gr: 400,
        fewest: true,
      },
      help: {
        look: {
          text: {
            pl: "Zacznij od największej monety, która nie jest za duża.",
            en: "Start with the biggest coin that is not too big.",
          },
        },
        boost: {
          text: {
            pl: "Moneta 5 zł to za dużo. Która moneta jest następna, mniejsza?",
            en: "A 5 zł coin is too much. Which coin comes next, smaller?",
          },
        },
        boost_by_mistake: {
          not_fewest: {
            text: {
              pl: "Kwota się zgadza! A czy da się zapłacić tyle samo mniejszą liczbą monet?",
              en: "The amount is right! Can you pay the same with fewer coins?",
            },
          },
          zloty_grosze_mixed: {
            text: {
              pl: "Uwaga: to są grosze, a trzeba zapłacić złote. 100 groszy to jeden złoty.",
              en: "Careful: those are grosze, and you need to pay złoty. 100 grosze make one złoty.",
            },
          },
        },
        worked: [
          {
            pl: "5 zł to za dużo",
            en: "5 zł is too much",
          },
          "2 zł + 2 zł = 4 zł",
          {
            pl: "Dwie monety: mniej się nie da",
            en: "Two coins: you cannot use fewer",
          },
        ],
      },
    },
    twin: {
      question_type: "money_pay",
      family: "place",
      say: {
        pl: "Zapłać siedem złotych jak najmniejszą liczbą monet.",
        en: "Pay seven złoty with as few coins as you can.",
      },
      data: {
        surface: "coins",
        bank: ["gr2", "gr50", "zl1", "zl2", "zl5"],
        amount_label: "7 zł",
        slots: 8,
        total: "hidden",
      },
      key: {
        surface: "coins",
        amount_gr: 700,
        fewest: true,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Połóż dwa razy 2 zł, potem {check}",
          en: "Put in 2 zł twice, then {check}",
        },
        value: {
          items: ["zl2", "zl2"],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Połóż cztery razy 1 zł",
          en: "Put in 1 zł four times",
        },
        value: {
          items: ["zl1", "zl1", "zl1", "zl1"],
        },
        outcome: "incorrect",
        mistake_class: "not_fewest",
        marks: [],
      },
      {
        try: {
          pl: "Połóż dwa razy 2 gr",
          en: "Put in 2 gr twice",
        },
        value: {
          items: ["gr2", "gr2"],
        },
        outcome: "incorrect",
        mistake_class: "zloty_grosze_mixed",
        marks: [],
      },
      {
        try: {
          pl: "Połóż 50 gr i 50 gr",
          en: "Put in 50 gr and 50 gr",
        },
        value: {
          items: ["gr50", "gr50"],
        },
        outcome: "incorrect",
        mistake_class: "too_little",
        marks: [],
      },
    ],
  },
  {
    id: "shade-three-quarters",
    label: "Shade three quarters of a bar",
    showcase: true,
    question: {
      question_type: "fraction_shade",
      family: "place",
      say: {
        pl: "Zamaluj trzy czwarte paska.",
        en: "Shade three quarters of the bar.",
      },
      data: {
        surface: "fraction",
        shape: "bar",
        parts: 4,
        label: "$\\frac{3}{4}$",
      },
      key: {
        surface: "fraction",
        count: 3,
      },
      help: {
        look: {
          text: {
            pl: "Pasek jest podzielony na 4 równe części. Każda część to jedna czwarta.",
            en: "The bar is cut into 4 equal parts. Each part is one quarter.",
          },
        },
        boost: {
          text: {
            pl: "Liczba na dole mówi, na ile części podzielono pasek. Liczba na górze mówi, ile części zamalować.",
            en: "The bottom number says how many parts the bar is cut into. The top number says how many parts to shade.",
          },
        },
        boost_by_mistake: {
          shaded_the_rest: {
            text: {
              pl: "Zamalowana jest część, która zostaje. Zamaluj te części, o które pytamy.",
              en: "You shaded the part that is left over. Shade the parts the fraction asks for.",
            },
          },
          shaded_whole: {
            text: {
              pl: "Cały pasek to cztery czwarte. Ile czwartych trzeba?",
              en: "The whole bar is four quarters. How many quarters are asked for?",
            },
          },
          off_by_one_part: {
            text: {
              pl: "Prawie. Policz zamalowane części jeszcze raz, palcem po kolei.",
              en: "Almost. Count the shaded parts again, one finger at a time.",
            },
          },
        },
        almost: [
          {
            pl: "Pasek ma 4 części.",
            en: "The bar has 4 parts.",
          },
          {
            pl: "Zamaluj □ z nich.",
            en: "Shade □ of them.",
          },
        ],
        worked: [
          {
            pl: "Na dole jest 4: pasek ma 4 równe części.",
            en: "The bottom is 4: the bar has 4 equal parts.",
          },
          {
            pl: "Na górze jest 3: zamalowujemy 3 części.",
            en: "The top is 3: we shade 3 parts.",
          },
          {
            pl: "Trzy zamalowane części z czterech to trzy czwarte.",
            en: "Three shaded parts out of four is three quarters.",
          },
        ],
      },
    },
    twin: {
      question_type: "fraction_shade",
      family: "place",
      say: {
        pl: "Zamaluj dwie trzecie paska.",
        en: "Shade two thirds of the bar.",
      },
      data: {
        surface: "fraction",
        shape: "bar",
        parts: 3,
        label: "$\\frac{2}{3}$",
      },
      key: {
        surface: "fraction",
        count: 2,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zamaluj trzy części, potem {check}",
          en: "Shade three parts, then {check}",
        },
        value: {
          shaded: [0, 1, 2],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj pierwszą, trzecią i czwartą część (też dobrze)",
          en: "Shade the first, third and fourth parts (right too)",
        },
        value: {
          shaded: [0, 2, 3],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj jedną część (tę, której nie trzeba)",
          en: "Shade one part (the one left over)",
        },
        value: {
          shaded: [3],
        },
        outcome: "incorrect",
        mistake_class: "shaded_the_rest",
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj dwie części (o jedną za mało)",
          en: "Shade two parts (one too few)",
        },
        value: {
          shaded: [0, 1],
        },
        outcome: "incorrect",
        mistake_class: "off_by_one_part",
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj cały pasek",
          en: "Shade the whole bar",
        },
        value: {
          shaded: [0, 1, 2, 3],
        },
        outcome: "incorrect",
        mistake_class: "shaded_whole",
        marks: [],
      },
    ],
  },
  {
    id: "pizza-two-sixths",
    label: "Shade two sixths of a pizza cut into six slices",
    question: {
      question_type: "fraction_shade",
      family: "place",
      say: {
        pl: "Kasia zjadła dwie szóste pizzy. Zamaluj kawałki, które zjadła.",
        en: "Kasia ate two sixths of the pizza. Shade the slices she ate.",
      },
      data: {
        surface: "fraction",
        shape: "circle",
        parts: 6,
        label: "$\\frac{2}{6}$",
        stem: {
          text: {
            pl: "Pizza jest pokrojona na 6 równych kawałków.",
            en: "The pizza is cut into 6 equal slices.",
          },
        },
      },
      key: {
        surface: "fraction",
        count: 2,
      },
      help: {
        look: {
          text: {
            pl: "Policz, na ile kawałków pokrojono pizzę.",
            en: "Count how many slices the pizza is cut into.",
          },
        },
        boost: {
          text: {
            pl: "Dwie szóste to dwa kawałki z sześciu. Zamaluj tylko te, które Kasia zjadła.",
            en: "Two sixths is two slices out of six. Shade only the ones Kasia ate.",
          },
        },
        boost_by_mistake: {
          shaded_the_rest: {
            text: {
              pl: "To są kawałki, które zostały na talerzu. Zamaluj te, które Kasia zjadła.",
              en: "Those are the slices left on the plate. Shade the ones Kasia ate.",
            },
          },
        },
        almost: [
          {
            pl: "Pizza ma 6 kawałków.",
            en: "The pizza has 6 slices.",
          },
          {
            pl: "Kasia zjadła □ z nich.",
            en: "Kasia ate □ of them.",
          },
        ],
        worked: [
          {
            pl: "Pizza jest pokrojona na 6 równych kawałków: to szóste.",
            en: "The pizza is cut into 6 equal slices: sixths.",
          },
          {
            pl: "Kasia zjadła 2 kawałki, więc zamalowujemy 2.",
            en: "Kasia ate 2 slices, so we shade 2.",
          },
        ],
      },
    },
    twin: {
      question_type: "fraction_shade",
      family: "place",
      say: {
        pl: "Kuba zjadł trzy ósme tortu. Zamaluj kawałki, które zjadł.",
        en: "Kuba ate three eighths of the cake. Shade the slices he ate.",
      },
      data: {
        surface: "fraction",
        shape: "circle",
        parts: 8,
        label: "$\\frac{3}{8}$",
      },
      key: {
        surface: "fraction",
        count: 3,
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zamaluj dwa kawałki, potem {check}",
          en: "Shade two slices, then {check}",
        },
        value: {
          shaded: [0, 1],
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj cztery kawałki (te, które zostały)",
          en: "Shade four slices (the ones left)",
        },
        value: {
          shaded: [0, 1, 2, 3],
        },
        outcome: "incorrect",
        mistake_class: "shaded_the_rest",
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj trzy kawałki",
          en: "Shade three slices",
        },
        value: {
          shaded: [0, 1, 2],
        },
        outcome: "incorrect",
        mistake_class: "off_by_one_part",
        marks: [],
      },
      {
        try: {
          pl: "Zamaluj pięć kawałków",
          en: "Shade five slices",
        },
        value: {
          shaded: [0, 1, 2, 3, 4],
        },
        outcome: "incorrect",
        mistake_class: "wrong_count",
        marks: [],
      },
    ],
  },
  {
    id: "split-six-sevens",
    label: "Build 6 × 7, then split it into 6 × 5 and 6 × 2",
    showcase: true,
    question: {
      question_type: "area_model",
      family: "place",
      say: {
        pl: "Zbuduj prostokąt sześć na siedem. Potem podziel go tak, żeby jedna część była sześć razy pięć.",
        en: "Build a rectangle six by seven. Then split it so one part is six times five.",
      },
      data: {
        surface: "grid",
        size: 9,
        label: "6 × 7",
        split: "one",
        cells: "squares",
      },
      key: {
        surface: "grid",
        rows: 6,
        cols: 7,
        either_order: true,
        split: {
          accept_at: [5],
        },
      },
      help: {
        look: {
          text: {
            pl: "Najpierw zbuduj cały prostokąt: 6 rzędów, w każdym 7 kratek.",
            en: "First build the whole rectangle: 6 rows, 7 squares in each.",
          },
        },
        boost: {
          text: {
            pl: "Sześć razy pięć już znasz. Odlicz 5 kolumn od lewej i podziel tam prostokąt.",
            en: "You already know six times five. Count 5 columns from the left and split the rectangle there.",
          },
        },
        boost_by_mistake: {
          no_split: {
            text: {
              pl: "Prostokąt jest gotowy. Teraz dotknij paska nad nim, żeby go podzielić.",
              en: "The rectangle is ready. Now tap the strip above it to split it.",
            },
          },
          wrong_size: {
            text: {
              pl: "Policz rzędy i kolumny jeszcze raz: ma być 6 rzędów po 7 kratek.",
              en: "Count the rows and columns again: 6 rows of 7 squares.",
            },
          },
        },
        almost: [
          {
            pl: "6 × 7 = 6 × 5 + 6 × □",
            en: "6 × 7 = 6 × 5 + 6 × □",
          },
        ],
        worked: [
          {
            pl: "Zbuduj 6 rzędów po 7 kratek.",
            en: "Build 6 rows of 7 squares.",
          },
          {
            pl: "Podziel za piątą kolumną: z lewej jest 6 × 5, z prawej 6 × 2.",
            en: "Split after the fifth column: 6 × 5 on the left, 6 × 2 on the right.",
          },
          {
            pl: "6 × 7 = 6 × 5 + 6 × 2",
            en: "6 × 7 = 6 × 5 + 6 × 2",
          },
        ],
      },
    },
    twin: {
      question_type: "area_model",
      family: "place",
      say: {
        pl: "Zbuduj prostokąt cztery na osiem. Potem podziel go tak, żeby jedna część była cztery razy pięć.",
        en: "Build a rectangle four by eight. Then split it so one part is four times five.",
      },
      data: {
        surface: "grid",
        size: 9,
        label: "4 × 8",
        split: "one",
        cells: "squares",
      },
      key: {
        surface: "grid",
        rows: 4,
        cols: 8,
        either_order: true,
        split: {
          accept_at: [5],
        },
      },
    },
    scenarios: [
      {
        try: {
          pl: "Zbuduj 6 × 7, podziel za piątą kolumną, potem {check}",
          en: "Build 6 × 7, split after the fifth column, then {check}",
        },
        value: {
          rows: 6,
          cols: 7,
          split: {
            axis: "cols",
            at: 5,
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zbuduj 6 × 7, podziel za drugą kolumną (też 5 i 2)",
          en: "Build 6 × 7, split after the second column (5 and 2 as well)",
        },
        value: {
          rows: 6,
          cols: 7,
          split: {
            axis: "cols",
            at: 2,
          },
        },
        outcome: "correct",
        mistake_class: null,
        marks: [],
      },
      {
        try: {
          pl: "Zbuduj 6 × 7 i naciśnij {check} bez dzielenia",
          en: "Build 6 × 7 and press {check} without a split",
        },
        value: {
          rows: 6,
          cols: 7,
        },
        outcome: "incorrect",
        mistake_class: "no_split",
        marks: [
          {
            id: "size",
            correct: true,
          },
          {
            id: "split",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Zbuduj 6 × 7, podziel za trzecią kolumną",
          en: "Build 6 × 7, split after the third column",
        },
        value: {
          rows: 6,
          cols: 7,
          split: {
            axis: "cols",
            at: 3,
          },
        },
        outcome: "incorrect",
        mistake_class: "split_not_helpful",
        marks: [
          {
            id: "size",
            correct: true,
          },
          {
            id: "split",
            correct: false,
          },
        ],
      },
      {
        try: {
          pl: "Zbuduj 6 × 6 (o jedną kolumnę za mało)",
          en: "Build 6 × 6 (one column short)",
        },
        value: {
          rows: 6,
          cols: 6,
          split: {
            axis: "cols",
            at: 5,
          },
        },
        outcome: "incorrect",
        mistake_class: "wrong_size",
        marks: [
          {
            id: "size",
            correct: false,
          },
          {
            id: "split",
            correct: false,
          },
        ],
      },
    ],
  },
];
