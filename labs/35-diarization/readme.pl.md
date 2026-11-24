# 35 — Kto mówił i kiedy

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat pomiarów poniżej pozostaje oryginalnym dowodem.

**12 minut.** Wymagania wstępne: laboratorium 34;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy trzy głosy są trudniejsze niż dwa i czy przerwanie wypowiedzi
   jest trudniejsze niż mówienie po kolei.
2. Uruchom `npm run azure:agents -- 35-diarization`.
3. Odtwórz każde nagranie i porównaj rzeczywistą oś czasu z osią modelu.

**Co się dzieje:** sześć syntetycznych wypowiedzi (trzy głosy) jest łączonych
w trzy rozmowy o dokładnie znanym czasie: dwóch mówców, trzech mówców
oraz dwóch mówców, z których jeden przerywa drugiemu. Detekcja aktywności
głosowej ustala, kiedy każdy głos naprawdę mówi. Do `gpt-4o-transcribe-diarize`
trafia wyłącznie dźwięk. Kod dopasowuje arbitralne etykiety mówców modelu
(A, B...) do głosów według nakładania się w czasie i raportuje pokrycie,
poprawność w pokrytych fragmentach oraz ogólne przypisanie wypowiedzi.

**Oczekiwane:** transkrypcja może być poprawna, a przypisanie mówców nie,
ponieważ to osobne pomiary; segmenty modelu pomijają naturalne pauzy
(pokrycie poniżej 100%); przerwanie wypowiedzi jest trudnym przypadkiem.
W naszym ostatnim wykonaniu przypisanie dla dwóch i trzech mówców bez
nakładania było w pokrytych fragmentach poprawne w 100%, lecz podczas
przerwania poprawność spadła do 84%, a transkrypcja straciła słowa (29% błędów słów).
**Oryginalny dowód:**
> two clean speakers and three speakers were attributed 100% correctly where covered, but during the interruption
> attribution accuracy fell to 84% and the transcript lost words (29% word error rate).

Połączenie dwóch głosów w jednego mówcę to kolejny rzeczywisty błąd, którego
występowanie zmienia się między wykonaniami.

**Wypróbuj:** zmień czas nakładania podczas przerwania w `scenarios`
(`lib/genai/diarization-lab.mjs`) z 2 na 4 sekundy.

**Ograniczenia:** tylko trzy syntetyczne głosy i trzy rozmowy, po jednym
wykonaniu. Prawdziwe spotkania dodają szum, podobne głosy i więcej mówców.
