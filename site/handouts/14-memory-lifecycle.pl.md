# 14 — Aktualizuj i usuwaj zapisany fakt

[English](14-memory-lifecycle.en.md) | [Polski](14-memory-lifecycle.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Literały odpowiedzi poniżej pochodzą z oryginalnego ćwiczenia.

**6 minut; trzy żądania czatu w Azure.** Przedstaw cykl życia pamięci bez
zbierania danych uczniów.

1. Po [konfiguracji](../../README.md#setup-and-deploy) uruchom `node labs/14-memory-lifecycle/demo.mjs`.
2. Zapisz i przekaż Otter. Oczekiwana odpowiedź: `Otter`.
3. Zastąp zapisaną wartość przez Falcon. Oczekiwana odpowiedź: `Falcon`.
4. Zapisz pusty magazyn, wczytaj go w nowym procesie i zadaj pytanie w nowym czacie.
   Oczekiwana odpowiedź: `UNKNOWN`.
5. Sprawdź `results/memory/14-memory-lifecycle.json`: musi zawierać `{}`.

Skrypt sprawdza, czy zapomniane wartości są nieobecne w końcowym żądaniu,
a nie tylko czy model twierdzi, że zapomniał. Zachowanie starej historii rozmowy
ponownie wprowadziłoby fakt, nawet po usunięciu go z magazynu pamięci.

**Ważne:** usuwana jest wyłącznie aktywna wartość w magazynie demonstracyjnym.
Historyczne wyniki, publiczne dowody w galerii, nagrania, logi dostawcy i kopie
zapasowe nie są usuwane. Używaj wyłącznie fikcyjnych faktów. Rzeczywiste systemy
wymagają ograniczenia zakresu przechowywania, zgody, zasad retencji i aktualizacji
oraz usuwania we wszystkich właściwych magazynach.

**Wypróbuj:** wyjaśnij, dlaczego „zignoruj starą wartość” nie oznacza jej usunięcia.
**Infrastruktura:** wspólny GPT-4o; odizolowany lokalny magazyn JSON; bez nowej usługi Azure.
**Dowody:** `results/14-memory-lifecycle.json` zapisuje każdą migawkę i odpowiedź.
