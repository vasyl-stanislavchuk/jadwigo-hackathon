:::meta
eyebrow: Jadwigo · identity
subtitle: The same 6 lines in 3 registers, plus the message for the class chat
by: the jadwigo-marketing session for dl-w0b4.27
when: 2026-10-27T15:00:00Z
:::

# Voice: the same lines in each register

Every register below says [the same 6 lines](data/identity.json). They are a landing headline, a parent's call to action, a child's welcome, a right answer, a miss and a pause. A last line sits under them: the message a parent posts in the class chat. It's there because the class chat is where the first families come from. Every line is a draft for a native speaker to review.

:::table The voice sheet (generated from data/identity.json by build.ts)
| Line | Spokojny przewodnik (a calm guide) | Życzliwa nauczycielka (a kind teacher) | Ciekawy towarzysz (a curious companion) |
| --- | --- | --- | --- |
| Nagłówek strony (rodzic) · landing headline (parent) | Nauka w swoim tempie. Bez punktów i bez pośpiechu. | Zobacz, co Twoje dziecko już umie, a co warto jeszcze poćwiczyć. | Każde „dlaczego” to dobry początek. |
| Przycisk dla rodzica · parent's call to action | Otwórz pierwszą lekcję | Zacznij od krótkiej lekcji | Wypróbuj zagadkę z dzieckiem |
| Powitanie dziecka · child's welcome | Cześć. Zaczniemy od kilku zadań. Masz tyle czasu, ile chcesz. | Dzień dobry! Rozwiążmy razem kilka zadań. | Gotowi? Go! Pierwsza zagadka już czeka. |
| Dobra odpowiedź · right answer | Dobrze. Tak właśnie jest. | Dobrze! Dobrze pomyślane. | Jest! Właśnie tak. |
| Jeszcze nie · miss | Jeszcze nie. Spójrz na zaznaczone miejsce. | Jeszcze nie. Popraw zaznaczone miejsce, dasz radę. | Jeszcze nie. Coś tu się nie zgadza, spójrz jeszcze raz. |
| Przerwa · pause | Lekcja poczeka. Wrócisz, kiedy zechcesz. | Zróbmy przerwę. Lekcja zaczeka na ciebie. | Przerwa! Zagadka poczeka na ciebie. |
| Wiadomość na czacie klasy (7. linia) · class chat message (line 7) | Zrobiliśmy z synem krótkie lekcje matematyki, bez punktów i bez reklam. Jeśli chcecie spróbować z dzieckiem: jadwigo.pl | Dzień dobry, przygotowaliśmy dla naszej klasy krótkie lekcje matematyki. Są bezpłatne i bez reklam. Link: jadwigo.pl | Robimy z synem zagadki matematyczne dla jego klasy. Bez punktów i bez reklam. Zagracie z nami? jadwigo.pl |
:::

## How each one sounds

- **Spokojny przewodnik** (a calm guide): Short sentences, few exclamation marks, nothing hurried. It speaks the way a parent sits next to a child doing homework.
- **Życzliwa nauczycielka** (a kind teacher): Warm and clear, the way a good teacher talks in the first school grades. It names what went well, shows the next step and says where each question comes from.
- **Ciekawy towarzysz** (a curious companion): Playful and curious, plays with the "go" in the name (gotowi, dlaczego). It treats a question as a riddle to solve together, never as a test.

## Rules every line keeps

- No line a child reads says "źle", "zły", "błąd", "błędnie", "niepoprawnie", "nie tak" or "porażka". A miss is "Jeszcze nie", which is information, not failure.
- No points, clocks, streaks or rankings, and no praise inflation. A child is "ty", and a parent is "Ty" with a capital, as on the rest of the site.
- No line asks a child to get a parent to buy or do anything (UOKiK). The chat message is written by a parent for parents.
- Numbers are digits, in Polish as in English.

:::aside
The lesson today already says "Dobrze!", "Jeszcze nie." and "Lekcja poczeka. Wrócisz do tego samego pytania." (david-learns `frontend/src/copy/pl.ts`, still `reviewed: false`). Whichever register the owner picks, those strings move to it in the follow-up issue, not here.
:::
