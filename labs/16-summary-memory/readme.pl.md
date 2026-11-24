# 16 — Skompresuj kontekst do użytecznego podsumowania

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Nazwy i wartości danych poniżej pozostają oryginalne.

**7 minut; trzy żądania czatu w Azure.** Pokaż tanią formę kompresji pamięci
roboczej, a nie test obciążeniowy maksymalnego okna kontekstu.

1. Po [konfiguracji](../../README.md#setup-and-deploy) uruchom `node labs/16-summary-memory/demo.mjs`.
2. Pierwsze żądanie podsumowuje długie fikcyjne notatki ze spotkania, wyodrębniając
   ostateczne decyzje.
3. Nowe żądanie bez notatek i podsumowania musi odpowiedzieć `UNKNOWN`.
4. Kolejne nowe żądanie otrzymuje rzeczywiście wygenerowane podsumowanie
   i odtwarza nazwę projektu Comet, budżet 42 kredytów oraz dzień prezentacji Friday (piątek).
5. Porównaj rzeczywiste zużycie tokenów wejściowych: wejście z podsumowaniem musi
   być mniejsze niż pierwotne żądanie podsumowania. Instrukcje również się różnią,
   więc stosunek ten jest demonstracją, a nie kontrolowanym, uniwersalnym oszacowaniem oszczędności.

**Wypróbuj:** dodaj czwartą ostateczną decyzję w [notatkach](../../lib/advanced-labs.mjs),
a następnie zapytaj, czy przetrwała. Samodzielnie sprawdź źródło, podsumowanie
i odpowiedź. Podsumowanie ma własny koszt i może pomijać lub zniekształcać fakty.
Nie jest kompresją bezstratną ani dowodem, że model pamięta wszystko.

**Infrastruktura:** wspólny GPT-4o; wygenerowane podsumowanie przechowywane przez klienta.
**Dowody:** `results/16-summary-memory.json` zapisuje podsumowanie i zmierzone
zmniejszenie liczby tokenów wejściowych; sprawdzane są zarówno zachowanie faktów,
jak i zmniejszenie rozmiaru wejścia.
