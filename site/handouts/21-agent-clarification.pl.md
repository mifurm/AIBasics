# 21 — Zapytaj zamiast zgadywać

[English](21-agent-clarification.en.md) | [Polski](21-agent-clarification.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**7 minut.** Wymagania wstępne: laboratorium 19 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 21-agent-clarification`.
2. Zauważ, że początkowa ilość to `null`, a nie wymyślona liczebność klasy.
3. Sprawdź pierwsze działanie, `ask_user`, i jego jawnie zaprogramowaną odpowiedź 2.
4. Prześledź wyszukiwanie i obliczenie sumy 46 fikcyjnych kredytów.

**Oczekiwane:** doprecyzowanie następuje przed innymi narzędziami. Obliczenia
odrzucają nieznaną lub niezgodną ilość. Katalog nie może odpowiedzieć na pytanie
o zamiar użytkownika.

**Wypróbuj:** zmień `classroomReply` w `lib/agent-labs.mjs` i oczekiwaną sumę
w ewaluatorze, wdróż ponownie i porównaj.

**Infrastruktura/dowody:** Azure GPT-4o i zadanie Azure; wyniki Azure Monitor
dostępne po uwierzytelnieniu są pobierane do `results/21-agent-clarification.json`.
Odpowiedź jest powtarzalnym scenariuszem testowym do zajęć, a nie interakcją
z człowiekiem na żywo.
