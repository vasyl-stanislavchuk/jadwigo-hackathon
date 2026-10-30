---
title: Prywatność · Jadwigo
description: Jakie dane Jadwigo dostaje, gdy rodzic loguje się przez Google lub Facebooka, i co z nimi robi.
heading: Prywatność
lang: pl
path: /prywatnosc
translation: /en/privacy
draftNote: Wersja robocza. Ten tekst czeka na przegląd prawnika i może się jeszcze zmienić.
reviewed: false
---

Jadwigo to aplikacja do nauki dla dzieci z pierwszych klas szkoły podstawowej. Konto w niej zakłada
rodzic. Tutaj piszemy, jakie dane dostajemy, gdy rodzic się loguje, i co z nimi robimy.

## Jak rodzic się loguje

Rodzic loguje się na jeden z 3 sposobów: kodem wysłanym na swój adres e-mail, kontem Google albo
kontem Facebook. Logowanie obsługuje dla nas Supabase, usługa logowania, z której korzysta Jadwigo.

## Co dostajemy od Google i Facebooka

Gdy rodzic loguje się kontem Google albo Facebook, ta usługa przekazuje nam:

- adres e-mail rodzica,
- informację, czy Google lub Facebook potwierdził ten adres,
- identyfikator konta rodzica w Google lub na Facebooku.

Od Facebooka prosimy tylko o adres e-mail i profil publiczny (uprawnienia `email` i `public_profile`).

Google i Facebook przesyłają też imię, nazwisko i zdjęcie profilowe. Nie przechowujemy ich i nie
używamy.

Nie dostajemy hasła do konta Google ani Facebook. Nie widzimy znajomych, postów, zdjęć ani kontaktów
rodzica i niczego nie publikujemy w jego imieniu.

## Gdzie są te dane

Adres e-mail i identyfikator konta Google lub Facebook przechowuje Supabase, bo bez nich rodzic nie
mógłby się zalogować. Własna baza Jadwigo zapisuje z logowania tylko identyfikator użytkownika nadany
przez Supabase. Po nim rozpoznajemy konto rodzica.

## Usunięcie danych

Rodzic może w każdej chwili poprosić o usunięcie konta i danych z nim powiązanych. Jak to zrobić,
piszemy na stronie [Usuwanie danych](/prywatnosc/usuwanie-danych/).
