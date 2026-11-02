---
title: Prywatność · Jadwigo
description: Jakie dane Jadwigo dostaje od rodzica, od Google i od Facebooka, kto je przetwarza i co z nimi robi.
heading: Prywatność
lang: pl
path: /prywatnosc
translation: /en/privacy
draftNote: Wersja robocza. Ten tekst czeka na przegląd prawnika i może się jeszcze zmienić.
reviewed: true
---

Jadwigo to aplikacja do nauki dla dzieci z pierwszych klas szkoły podstawowej. Konto w niej zakłada
rodzic. Tutaj piszemy, jakie dane dostajemy, kto je przetwarza i co z nimi robimy.

## Jak rodzic się loguje

Rodzic loguje się na jeden z 3 sposobów: kodem wysłanym na swój adres e-mail, kontem Google albo
kontem Facebook. Logowanie obsługuje dla nas Supabase, usługa logowania, z której korzysta Jadwigo.

## Co dostajemy od Google i Facebooka

Gdy rodzic loguje się kontem Google albo Facebook, ta usługa przekazuje nam:

- adres e-mail rodzica;
- informację, czy Google lub Facebook potwierdził ten adres;
- identyfikator konta rodzica w Google lub na Facebooku.

Od Facebooka prosimy tylko o adres e-mail i profil publiczny (imię i zdjęcie).

Google i Facebook przesyłają też imię, nazwisko i zdjęcie profilowe rodzica. Usuwamy je, zanim
cokolwiek zapiszemy, i nie używamy ich.

Nie dostajemy hasła do konta Google ani Facebook. Nie widzimy znajomych, postów, zdjęć ani kontaktów
rodzica i niczego nie publikujemy w jego imieniu.

## Co rodzic wpisuje o dziecku

Rodzic podaje imię dziecka. Może też podać jego klasę i opisać cel nauki własnymi słowami.
Gdy dziecko przerabia lekcje, zapisujemy jego odpowiedzi i postępy.

## Odpowiedzi dziecka

Odpowiedzi dziecka i jego postępy w lekcjach widzi tylko rodzic, na swoim koncie. Inne rodziny ich
nie widzą. Gdy rodzic prosi Jadwigo AI o lekcję albo podsumowanie, Jadwigo AI czyta
odpowiedzi i imię dziecka, żeby przygotować lekcję albo podsumowanie.

## Jadwigo AI i modele Meta

Jadwigo AI działa na modelach AI firmy Meta. Gdy rodzic pisze do Jadwigo AI, wysyłamy do
firmy Meta wiadomości rodzica i dane dziecka, których Jadwigo AI potrzebuje: imię, cele, postępy, odpowiedzi, błędy
i przerobione lekcje.
Meta przetwarza je na własnych zasadach. W samej lekcji, którą dziecko przerabia, nie ma jego
imienia.

## Statystyki i nagrania ekranu

Na stronie i w aplikacji pytamy, czy możemy zapisywać, jak z nich korzystasz. Dopóki nie odpowiesz,
nic nie zapisujemy. Gdy się zgodzisz, PostHog zapisuje odwiedzone strony, kilka kroków, takich jak
dodanie dziecka czy logowanie, i nagrania ekranu. Na nagraniu widać to, co pokazuje ekran, także
imię dziecka i pytania z lekcji. Nie widać tego, co wpisujesz w pola formularzy. Na urządzeniu
zapisujemy wtedy plik cookie PostHog. Gdy odmówisz, liczymy tylko wizytę i te kroki, bez cookie i bez
nagrania, więc nie wiemy, że to wciąż Ty. Do zdarzeń nie trafia imię, e-mail, odpowiedź ani wynik dziecka. Nie zapisujemy adresu
IP.

## Kto przetwarza dane

Dane rodziny przetwarzają dla nas te firmy:

- Supabase: logowanie i baza danych Jadwigo, na serwerach we Frankfurcie, w Unii Europejskiej.
- Amazon Web Services: serwery aplikacji Jadwigo, też we Frankfurcie.
- Meta: modele AI, na których działa Jadwigo AI, i logowanie przez Facebooka.
- Google: logowanie kontem Google i skrzynka privacy@jadwigo.pl.
- PostHog: statystyki i nagrania ekranu, po Twojej zgodzie, na serwerach we Frankfurcie.

## Jak długo trzymamy dane

Dane trzymamy, dopóki istnieje konto rodzica.

## Usunięcie danych

Rodzic może w każdej chwili poprosić o usunięcie konta i danych z nim powiązanych, także odpowiedzi
dziecka. Jak to zrobić, piszemy na stronie [Usuwanie danych](/prywatnosc/usuwanie-danych/).
