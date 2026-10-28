import type { CopyTable } from "./types.ts";

// Every pl line ships reviewed: false until a parent reads it (muse-build-guide, Lane D).
export const pl: CopyTable = {
  continue: { text: "Dalej", reviewed: false },
  check: { text: "Sprawdź", reviewed: false },
  erase: { text: "Usuń", reviewed: false },
  done: { text: "Gotowe", reviewed: false },
  show_more: { text: "Pokaż więcej", reviewed: false },
  answer_field: { text: "Twoja odpowiedź", reviewed: false },
  choose_answer: { text: "Wybierz odpowiedź", reviewed: false },
  build_rectangle: { text: "Zbuduj prostokąt", reviewed: false },
  choose_rectangle: { text: "Wybierz prostokąt", reviewed: false },
  dims: { text: "{rows} na {cols}", reviewed: false },
  array_label: {
    text: "{a} {rows_noun} po {b} {dots_noun}",
    reviewed: false,
    plural: {
      rows_noun: {
        count: "a",
        forms: { one: "rząd", few: "rzędy", many: "rzędów", other: "rzędów" },
      },
      dots_noun: {
        count: "b",
        forms: { one: "kropce", few: "kropki", many: "kropek", other: "kropek" },
      },
    },
  },
  groups_label: {
    text: "{a} {groups_noun} po {b}",
    reviewed: false,
    plural: {
      groups_noun: {
        count: "a",
        forms: { one: "grupa", few: "grupy", many: "grup", other: "grup" },
      },
    },
  },
  number_line_label: {
    text: "{b} {jumps_noun} po {a}",
    reviewed: false,
    plural: {
      jumps_noun: {
        count: "b",
        forms: { one: "skok", few: "skoki", many: "skoków", other: "skoków" },
      },
    },
  },
  table_row: { text: "Tabliczka mnożenia, rząd {row}", reviewed: false },
  swapped_order: { text: "Zamiana kolejności", reviewed: false },
  // ---- Tier-1: fill_blank, number_line (dl-w3.12, dl-w3.15) ----
  blank: { text: "Brakująca liczba", reviewed: false },
  number_line_axis: { text: "Oś liczbowa od {min} do {max}", reviewed: false },
  number_line_marker: { text: "Znacznik na {value}", reviewed: false },
  divisions_label: { text: "Części: {n}", reviewed: false },
  divisions_fewer: { text: "Mniej części", reviewed: false },
  divisions_more: { text: "Więcej części", reviewed: false },
  step_left: { text: "Krok w lewo", reviewed: false },
  step_right: { text: "Krok w prawo", reviewed: false },
  // ---- end Tier-1: fill_blank, number_line ----
  praise: [
    { text: "Tak, właśnie tak!", reviewed: false },
    { text: "Świetna robota!", reviewed: false },
    { text: "Dobrze pomyślane!", reviewed: false },
  ],
  // dl-w3.68.1: the other accepted form, after a right answer only
  other_form: { text: "Można też napisać: {form}", reviewed: false },
  sides_swapped_form: { text: "Albo: {form}", reviewed: false },
  try_again: [
    { text: "Spróbujmy jeszcze raz.", reviewed: false },
    { text: "Pomyśl jeszcze chwilę — dasz radę.", reviewed: false },
  ],
  move_on: { text: "Jeszcze nie wiem — dalej", reviewed: false },
  moved_on: { text: "Dobrze, wrócimy do tego.", reviewed: false },
  // dl-uukj.23: the playground's experiments, until the owner picks (dl-uukj.8, dl-uukj.9, dl-liwi.14)
  moved_on_calm: { text: "To nic. Zobacz, jak to idzie.", reviewed: false },
  noted: { text: "Dziękuję! Idziemy dalej.", reviewed: false },
  dont_know_yet: { text: "Jeszcze nie wiem", reviewed: false },
  start: { text: "Zaczynamy!", reviewed: false },
  mic_check: { text: "Sprawdzanie mikrofonu — już wkrótce", reviewed: false },
  no_voice_today: { text: "Dziś bez głosu", reviewed: false },
  tutor_resting: { text: "Dziś ćwiczymy po cichu.", reviewed: false },
  loading: { text: "Chwileczkę…", reviewed: false },
  saving: { text: "Zapisuję…", reviewed: false },
  connection_trouble: { text: "Chwileczkę, zapisuję jeszcze raz…", reviewed: false },
  load_failed: { text: "Coś się zacięło. Poproś rodzica o pomoc.", reviewed: false },
  finished: { text: "To już wszystko na dziś. Dziękuję!", reviewed: false },
  // dl-3xpn: the end-of-lesson card's heading, in the child's voice (owner 2026-10-05).
  can_do_heading: { text: "Co już umiem", reviewed: false },
  // dl-w2.4 drafts for a parent to read: warm, short, no pressure words.
  voice_resting: { text: "Głos teraz odpoczywa.", reviewed: false },
  voice_waking: { text: "Głos się budzi…", reviewed: false },
  voice_listening: { text: "Głos cię słucha.", reviewed: false },
  voice_speaking: { text: "Głos mówi…", reviewed: false },
  tap_to_hear: { text: "Dotknij, żeby usłyszeć", reviewed: false },
  play_clip: { text: "Posłuchaj", reviewed: false },
  play_clip_slow: { text: "Posłuchaj powoli", reviewed: false },
  session_finished: {
    text: "Ta lekcja już się skończyła. Dziękuję za ćwiczenie!",
    reviewed: false,
  },
  start_again: { text: "Zacznij jeszcze raz", reviewed: false },
  // true_false and reveal (dl-w3.11, dl-w3.13): drafts for a parent to read, warm and short.
  true_or_false: { text: "Prawda czy fałsz?", reviewed: false },
  yes: { text: "Tak", reviewed: false },
  no: { text: "Nie", reviewed: false },
  none_of_these: { text: "Żadna z tych odpowiedzi", reviewed: false },
  reveal_steps: { text: "Krok po kroku", reviewed: false },
  reveal_show: { text: "Pokaż", reviewed: false },
  reveal_drag: { text: "Przesuń, żeby zobaczyć", reviewed: false },
  reveal_predict: { text: "Jak myślisz, co będzie dalej?", reviewed: false },
  reveal_have_idea: { text: "Mam pomysł!", reviewed: false },
  reveal_not_sure: { text: "Jeszcze nie wiem", reviewed: false },
  // lettered_choice (dl-xdyq.4): drafts for a parent to read, warm and short. The alt never says what to count.
  contest_task_image: { text: "Zadanie z konkursu Alfik", reviewed: false },
  tried_option: { text: "sprawdzone", reviewed: false },
  hint: { text: "Podpowiedź", reviewed: false },
  worked_solution: { text: "Rozwiązanie", reviewed: false },
  help_me: { text: "Pomóż mi", reviewed: false },
  help_more: { text: "Więcej pomocy", reviewed: false },
  help_look: { text: "Spójrz jeszcze raz", reviewed: false },
  help_smaller: { text: "Mniejszy krok", reviewed: false },
  help_almost: { text: "Prawie: ostatnią linijkę piszesz ty", reviewed: false },
  help_twin: { text: "Teraz podobne. Twoja kolej!", reviewed: false },
  help_try_first: { text: "Najpierw spróbuj. Potem pokażę ci więcej.", reviewed: false },
  solution_step: { text: "Krok {n} z {total}", reviewed: false },
  solution_next: { text: "Następny krok", reviewed: false },
  solution_tap: { text: "Teraz dotknij litery z rozwiązania.", reviewed: false },
  // inline code and the terminal card (dl-i952.19): drafts to read.
  code_terminal: { text: "Terminal", reviewed: false },
  code_command: { text: "Polecenie", reviewed: false },
  code_output: { text: "Wynik", reviewed: false },
  code_copy: { text: "Skopiuj: {cmd}", reviewed: false },
  code_copied: { text: "Skopiowane", reviewed: false },
  code_copy_failed: {
    text: "Nie udało się skopiować. Zaznacz polecenie i skopiuj je ręcznie.",
    reviewed: false,
  },
  code_placeholder: {
    text: "W miejsce części w nawiasach ostrych wpisz identyfikator, który wypisał bd",
    reviewed: false,
  },
  // the printed sheet (dl-dcih): drafts for a parent to read.
  print_task: { text: "Zadanie {n}", reviewed: false },
  answer_card: { text: "Zaznacz odpowiedzi", reviewed: false },
  answer_card_note: {
    text: "Zamaluj całe kółko przy jednej literze, czarnym długopisem.",
    reviewed: false,
  },
  answer_card_example_right: { text: "Tak zaznaczaj", reviewed: false },
  answer_card_example_wrong: { text: "Tak nie zaznaczaj", reviewed: false },
  answer_card_fix: {
    text: "Zmieniasz zdanie? Przekreśl kółko znakiem X i zamaluj to, które wybierasz.",
    reviewed: false,
  },
  // drag and tap-tap for Sequence and Group (dl-w3.37.11): drafts to read
  drag_beside: { text: "{item} jest teraz obok: {other}.", reviewed: false },
  drag_hint: {
    text: "Przeciągnij kartę albo dotknij jej, a potem właściwego miejsca.",
    reviewed: false,
  },
  drag_picked: { text: "{item}: teraz dotknij właściwego miejsca.", reviewed: false },
  drag_moved_to: { text: "{item} jest teraz na miejscu {n}.", reviewed: false },
  drag_in_group: { text: "{item} jest w grupie: {group}.", reviewed: false },
  drag_tray: { text: "Jeszcze do rozłożenia", reviewed: false },
  tile_hint: {
    text: "Dotknij kafelka, a potem miejsca, na które idzie. Dotknij miejsca, aby je opróżnić.",
    reviewed: false,
  },
  tile_slot_empty: { text: "Miejsce {n}, puste", reviewed: false },
  tile_cleared: { text: "Miejsce {n} jest znowu puste.", reviewed: false },
  // the family views (dl-w3.37.12): drafts to read
  answer_yours: { text: "Twoja odpowiedź", reviewed: false },
  answer_right: { text: "Poprawna odpowiedź", reviewed: false },
  choose_all: { text: "Zaznacz wszystkie, które pasują.", reviewed: false },
  gap_label: { text: "Luka {n}", reviewed: false },
  hotspot_marker: { text: "Dotknięcie {n}, dotknij znowu, aby je zdjąć", reviewed: false },
  explain_field: { text: "Twoje wyjaśnienie", reviewed: false },
  explain_hint: { text: "Jedno lub dwa zdania wystarczą.", reviewed: false },
  explain_more: { text: "Napisz jeszcze trochę. Potem naciśnij Sprawdź.", reviewed: false },
  explain_pieces: { text: "Części twojego wyjaśnienia", reviewed: false },
  // draw a graph (dl-w3.51.3)
  bar_height: { text: "{label}: {value} {unit}", reviewed: false },
  bar_label: { text: "Słupek: {label}", reviewed: false },
  graph_label: { text: "Wykres od 0 do {max}", reviewed: false },
  incomplete_graph: { text: "Najpierw narysuj wykres.", reviewed: false },
  picture_stands_for: { text: "Jeden obrazek to {n} {unit}", reviewed: false },
  incomplete_parts: { text: "Najpierw dokończ każdą część.", reviewed: false },
  part_label: { text: "Część {n}", reviewed: false },
  // the step contract (dl-w3.41, docs/17 §2f): drafts for a parent to read
  incomplete_gaps: { text: "Uzupełnij jeszcze puste miejsca.", reviewed: false },
  incomplete_group: { text: "Ułóż jeszcze pozostałe karty.", reviewed: false },
  incomplete_place: { text: "Najpierw pokaż miejsce.", reviewed: false },
  incomplete_sequence: { text: "Najpierw zapełnij każde miejsce.", reviewed: false },
  incomplete_text: { text: "Najpierw wpisz odpowiedź.", reviewed: false },
  // Enter: an expression on the keypad (dl-w3.51.1)
  bracket_close: { text: "Nawias zamykający", reviewed: false },
  bracket_open: { text: "Nawias otwierający", reviewed: false },
  incomplete_expression: { text: "Dokończ działanie.", reviewed: false },
  // Enter: an equation on the keypad (dl-w3.70.17)
  sign_equals: { text: "Równa się", reviewed: false },
  // Enter: a ruler over a picture (dl-w3.51.4)
  ruler_at: { text: "Zero linijki przy {n} {unit} od lewej", reviewed: false },
  ruler_label: { text: "Linijka. Przeciągnij ją albo przesuń strzałkami.", reviewed: false },
  sign_divide: { text: "Podzielić", reviewed: false },
  sign_minus: { text: "Odjąć", reviewed: false },
  sign_plus: { text: "Dodać", reviewed: false },
  sign_times: { text: "Razy", reviewed: false },
  // Enter: a decimal on the keypad (dl-w3.70.7)
  decimal_comma: { text: "Przecinek", reviewed: false },
  incomplete_decimal: { text: "Dopisz cyfrę po przecinku.", reviewed: false },
  // Enter: a fraction in stacked boxes (dl-w3.70.16)
  incomplete_fraction_boxes: { text: "Wpisz licznik i mianownik.", reviewed: false },
  fraction_simplify: { text: "Czy możesz zapisać ten ułamek prościej?", reviewed: false },
  fraction_whole: { text: "Całości", reviewed: false },
  fraction_numerator: { text: "Licznik", reviewed: false },
  fraction_denominator: { text: "Mianownik", reviewed: false },
  // the playground: a Khan or bank item written in one language (dl-w3.61.9)
  written_in_en: { text: "To zadanie jest po angielsku", reviewed: false },
  written_in_pl: { text: "To zadanie jest po polsku", reviewed: false },
  checking: { text: "Sprawdzam…", reviewed: false },
  move_up: { text: "Przesuń w górę", reviewed: false },
  move_down: { text: "Przesuń w dół", reviewed: false },
  // dl-w3.61: each lane's lines, inside its own block (keys in copy/types.ts).
  // lane A: text (dl-w3.61.2)
  // end lane A
  // lane B: place core (dl-w3.61.3)
  point_label: { text: "Punkt: {label}", reviewed: false },
  hotspot_area: {
    text: "Obrazek. Strzałki przesuwają celownik, Enter stawia znacznik, Backspace zdejmuje ostatni.",
    reviewed: false,
  },
  hotspot_cursor: { text: "Celownik: {x} od lewej, {y} od góry", reviewed: false },
  // end lane B
  // lane C: gaps layouts (dl-w3.61.4)
  column_r0: { text: "jedności wyniku", reviewed: false },
  column_r1: { text: "dziesiątki wyniku", reviewed: false },
  column_r2: { text: "setki wyniku", reviewed: false },
  column_r3: { text: "tysiące wyniku", reviewed: false },
  column_c1: { text: "mała kratka w kolumnie dziesiątek", reviewed: false },
  column_c2: { text: "mała kratka w kolumnie setek", reviewed: false },
  column_c3: { text: "mała kratka w kolumnie tysięcy", reviewed: false },
  pyramid_label: { text: "Piramida liczbowa", reviewed: false },
  // end lane C
  // lane D: clock (dl-w3.61.5)
  clock_face: { text: "Zegar ze wskazówkami", reviewed: false },
  clock_hour_hand: { text: "Wskazówka godzinowa", reviewed: false },
  clock_minute_hand: { text: "Wskazówka minutowa", reviewed: false },
  clock_pick_hand: { text: "Którą wskazówkę przesuwasz?", reviewed: false },
  clock_points_at: { text: "wskazuje {n}", reviewed: false },
  clock_points_between: { text: "między {from} a {to}", reviewed: false },
  incomplete_clock: { text: "Najpierw przesuń wskazówkę.", reviewed: false },
  // end lane D
  // lane E: money (dl-w3.61.6)
  incomplete_coins: { text: "Najpierw połóż monety na tacce.", reviewed: false },
  coins_bank: { text: "Monety i banknoty", reviewed: false },
  coins_tray: { text: "Tacka", reviewed: false },
  coins_add: { text: "Połóż {value} na tacce", reviewed: false },
  coins_take_back: { text: "Zabierz {value} z tacki", reviewed: false },
  coins_slot_empty: { text: "Puste miejsce", reviewed: false },
  coins_total: { text: "Na tacce jest {amount}", reviewed: false },
  // end lane E
  // lane F: fractions and area (dl-w3.61.7)
  fraction_shape: { text: "Figura do zamalowania, równe części: {d}", reviewed: false },
  fraction_part: { text: "Część {n} z {d}", reviewed: false },
  incomplete_fraction: { text: "Najpierw zamaluj część.", reviewed: false },
  split_strip: { text: "Gdzie podzielić prostokąt", reviewed: false },
  split_after_col: { text: "Podziel za kolumną {n}", reviewed: false },
  split_after_row: { text: "Podziel pod wierszem {n}", reviewed: false },
  split_none: { text: "Prostokąt jeszcze nie jest podzielony.", reviewed: false },
  // end lane F
  // lane I: overview and decisions (dl-w3.61.10)
  // end lane I
  // the Polish letter row under a typed Polish answer (dl-uukj.28)
  letters_row: { text: "Polskie litery", reviewed: false },
  letters_capitals: { text: "Wielkie litery", reviewed: false },
  // end the Polish letter row
  // the design system's lines (dl-uukj.29.30): shown on /playground/system; lessons keep their
  // reviewed lines until a parent reads these (dl-uukj.29.28)
  ds_right_short: { text: "Dobrze!", reviewed: false },
  ds_miss_short: { text: "Jeszcze nie.", reviewed: false },
  ds_wait_hint: { text: "Najpierw odpowiedz, potem sprawdź.", reviewed: false },
  ds_fix_then_check: { text: "Popraw zaznaczone miejsce, potem sprawdź.", reviewed: false },
  ds_solution_band: { text: "Tak wygląda rozwiązanie.", reviewed: false },
  ds_compare_solution: { text: "Porównaj je ze swoją odpowiedzią.", reviewed: false },
  ds_close_tip: { text: "Zakończ na dziś. Postęp się zapisze.", reviewed: false },
  ds_your_answer: { text: "Twoja odpowiedź", reviewed: false },
  ds_right_answer: { text: "Poprawna odpowiedź", reviewed: false },
  ds_hint_title: { text: "Podpowiedź", reviewed: false },
  ds_wait_choose: { text: "Dotknij jednej odpowiedzi.", reviewed: false },
  ds_wait_enter: { text: "Wpisz albo powiedz wynik.", reviewed: false },
  ds_wait_gaps: { text: "Wpisz wszystkie cyfry wyniku.", reviewed: false },
  ds_wait_sequence: { text: "Ułóż wszystkie liczby w rzędzie.", reviewed: false },
  ds_wait_group: { text: "Przenieś każdą liczbę do grupy.", reviewed: false },
  ds_wait_place: { text: "Dotknij osi, aby postawić znacznik.", reviewed: false },
  ds_wait_explain: { text: "Napisz albo powiedz swoje wyjaśnienie.", reviewed: false },
  ds_wait_compound: { text: "Odpowiedz na obie części.", reviewed: false },
  ds_wait_word: { text: "Napisz albo powiedz słowo.", reviewed: false },
  ds_hint_of: { text: "{n} z {of}", reviewed: false },
  ds_miss_fix: { text: "Popraw zaznaczone miejsce.", reviewed: false },
  ds_help_title: { text: "Pomoc", reviewed: false },
  ds_solution_label: { text: "Rozwiązanie", reviewed: false },
  ds_slow: { text: "Wolniej", reviewed: false },
  ds_keys: { text: "Klawisze", reviewed: false },
  ds_open_picture: { text: "Powiększ obrazek", reviewed: false },
  ds_close_picture: { text: "Zamknij obrazek", reviewed: false },
  ds_more_below: { text: "Przewiń niżej", reviewed: false },
  ds_pause_title: { text: "Przerwa", reviewed: false },
  ds_pause_text: { text: "Lekcja poczeka. Wrócisz do tego samego pytania.", reviewed: false },
  ds_pause_back: { text: "Wróć do lekcji", reviewed: false },
  ds_pause_stop: { text: "Zakończ na dziś", reviewed: false },
  ds_sound: { text: "Dźwięk", reviewed: false },
  ds_end_title: { text: "Lekcja skończona.", reviewed: false },
  ds_end_question: { text: "Co robimy teraz?", reviewed: false },
  ds_end_again: { text: "Jeszcze raz trudne pytania ({n})", reviewed: false },
  ds_end_similar: { text: "Podobne pytania do ćwiczenia", reviewed: false },
  ds_end_done: { text: "Koniec na dziś", reviewed: false },
  ds_review_bar: { text: "Powtórka", reviewed: false },
  ds_progress_start: { text: "Lekcja: na początku", reviewed: false },
  ds_progress_half: { text: "Lekcja: mniej więcej połowa", reviewed: false },
  ds_progress_end: { text: "Lekcja: prawie koniec", reviewed: false },
  // end the design system's lines
  // the source credit (dl-uukj.29.136, docs/plan/design-system/source-credit/README.md §5), and the owner's confirmation before a link leaves Jadwigo (2026-10-27)
  credit_from: { text: "z {source}", reviewed: false },
  credit_title: { text: "Zadanie z {source}", reviewed: false },
  credit_label: { text: "z {source}, źródło i licencja", reviewed: false },
  credit_shared: { text: "Udostępnione na licencji {licence}", reviewed: false },
  credit_translated: {
    text: "Przetłumaczone na polski przez Jadwigo na licencji {licence}",
    reviewed: false,
  },
  credit_adapted: { text: "Dostosowane przez Jadwigo na licencji {licence}", reviewed: false },
  credit_both: {
    text: "Przetłumaczone i dostosowane przez Jadwigo na licencji {licence}",
    reviewed: false,
  },
  credit_source: { text: "Źródło: {source}", reviewed: false },
  credit_not_affiliated: { text: "Jadwigo nie jest związane z {source}", reviewed: false },
  credit_close: { text: "Zamknij", reviewed: false },
  leave_title: { text: "Ten link prowadzi poza Jadwigo", reviewed: false },
  leave_where: { text: "Otworzy się {where} w nowej karcie", reviewed: false },
  leave_stay: { text: "Zostań", reviewed: false },
  leave_go: { text: "Otwórz", reviewed: false },
  // end the source credit
  // the lesson player's end screen and pause (dl-5ssh.3.1)
  play_congrats: { text: "Brawo! To już wszystko na dziś.", reviewed: false },
  play_results_title: { text: "Pytania z tej lekcji", reviewed: false },
  play_results_none: { text: "Tu pojawią się pytania z lekcji.", reviewed: false },
  play_ended_correct: { text: "Udało się", reviewed: false },
  play_ended_missed: { text: "Jeszcze się uczymy", reviewed: false },
  play_ended_skipped: { text: "Wrócimy do tego", reviewed: false },
  play_ended_done: { text: "Zrobione", reviewed: false },
  play_ended_open: { text: "Jeszcze przed tobą", reviewed: false },
  play_results_twin: { text: "podobne pytanie", reviewed: false },
  play_results_help: { text: "Pomoc: {n}", reviewed: false },
  play_paused: { text: "Lekcja czeka na ciebie.", reviewed: false },
  play_paused_back: { text: "Wracam do lekcji", reviewed: false },
  play_not_found: { text: "Tej lekcji tu nie ma.", reviewed: false },
  // end the lesson player
  // parent login: the save prompt, the email code, a child, the parent home (dl-e8ov.2.38). Drafts:
  // the promise and consent wait on dl-e8ov.2.14 and dl-e8ov.2.9.
  play_save: { text: "Zapisz postępy", reviewed: false },
  play_save_note: {
    text: "Dla dorosłego: zaloguj się, a ta lekcja zostanie na koncie dziecka.",
    reviewed: false,
  },
  parent_title: { text: "Konto rodzica", reviewed: false },
  parent_off: { text: "Logowanie jest jeszcze wyłączone.", reviewed: false },
  parent_promise: {
    text: "Zapiszemy lekcje dziecka na Twoim koncie, żeby następne do niego pasowały.",
    reviewed: false,
  },
  parent_guardian: { text: "Jestem rodzicem lub opiekunem tego dziecka.", reviewed: false },
  parent_email: { text: "Twój e-mail", reviewed: false },
  parent_send_code: { text: "Wyślij kod", reviewed: false },
  parent_send_failed: { text: "Nie udało się wysłać kodu. Spróbuj za chwilę.", reviewed: false },
  parent_code: { text: "Kod z e-maila, 6 cyfr", reviewed: false },
  parent_code_sent: { text: "Wysłaliśmy kod na {email}.", reviewed: false },
  parent_sign_in: { text: "Zaloguj się", reviewed: false },
  parent_code_mismatch: {
    text: "Ten kod nie pasuje. Sprawdź e-mail i wpisz go jeszcze raz.",
    reviewed: false,
  },
  parent_add_child: { text: "Dodaj dziecko", reviewed: false },
  parent_first_name: { text: "Imię dziecka", reviewed: false },
  parent_add: { text: "Dodaj", reviewed: false },
  parent_whose: { text: "Czyja to była lekcja?", reviewed: false },
  parent_claimed_elsewhere: {
    text: "Ta lekcja jest już zapisana na innym koncie.",
    reviewed: false,
  },
  parent_claim_preview: {
    text: "Ta lekcja była na próbę, więc nie zapisujemy jej.",
    reviewed: false,
  },
  parent_no_attempts: { text: "Jeszcze nie ma tu lekcji.", reviewed: false },
  parent_sign_out: { text: "Wyloguj się", reviewed: false },
  // end parent login
  // the home page's featured lessons (dl-5ssh.3.6)
  home_title: { text: "Wybierz lekcję", reviewed: false },
  home_empty: { text: "Na razie nie ma tu lekcji.", reviewed: false },
  // end the home page
};
