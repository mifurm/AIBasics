# 06 — Tokeny, limity i ucinanie odpowiedzi

[English](06-token-budget.en.md) | [Polski](06-token-budget.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**5 minut.** Pokaż, dlaczego niski limit wyjścia to nie to samo co prośba o zwięzłość.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/06-token-budget/demo.mjs`.
3. Porównaj tę samą prośbę o dwanaście porad przy limitach wyjścia 24 i 280.
4. Sprawdź rzeczywiste zużycie tokenów odpowiedzi i `finishReason`, zamiast szacować liczbę słów.
5. Wypróbuj niski limit 40 w [promptach](../../lib/labs.mjs).

**Oczekiwane:** niski limit kończy odpowiedź z powodem `length` i najwyżej 24
tokenami odpowiedzi; wyższy nie przekracza 280. Skrypt sprawdza dokładnie te progi.
Wyższy limit też może uciąć odpowiedź, jeśli będzie dostatecznie długa.

Tokenami mogą być słowa, fragmenty słów lub znaki interpunkcyjne. Proporcje zależą
od języka. `max_tokens` nie ogranicza tokenów wejściowych ani nie narzuca budżetu
w dolarach. GPT-5-mini używa zamiast tego `max_completion_tokens`, obejmującego
również tokeny rozumowania.

**Prompt do ćwiczeń — tłumaczenie dydaktyczne, nie wykonany wynik:**
„Napisz numerowaną listę dwunastu praktycznych porad dotyczących pielęgnacji
rośliny w klasie. Każdą poradę zapisz jako jedno pełne zdanie”.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria.
**Dowody:** `results/06-token-budget.json`; laboratorium 06 w galerii; odpowiadające mu nagranie w prezentacji.
