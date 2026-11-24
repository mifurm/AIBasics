# 15 — Twórz i poprawiaj plan w kolejnych turach

[English](15-multiturn.en.md) | [Polski](15-multiturn.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat i literały poniżej należą do oryginalnego ćwiczenia.

**7 minut; trzy żądania czatu w Azure.** W odróżnieniu od stałej historii
z laboratorium 07 te wypowiedzi asystenta są naprawdę generowane, a następnie
wykorzystywane ponownie przez kolejne żądanie.

1. Po [konfiguracji](../../README.md#setup-and-deploy) uruchom `node labs/15-multiturn/demo.mjs`.
2. Tura 1 tworzy plan niebieskiego robota z kartonu.
3. Tura 2 mówi: „Zmień kolor na czerwony. Resztę pozostaw bez zmian”.
   Oryginalny prompt: "Change it to red. Keep everything else the same."
4. Tura 3 prosi o aktualny uzgodniony plan.
5. Sprawdź trzecie żądanie: zawiera obie rzeczywiste wcześniejsze odpowiedzi asystenta.

**Oczekiwane:** projekt `robot`, materiał `cardboard`; kolor zmienia się z `blue`
na `red` i pozostaje czerwony. Ścisły JSON ułatwia walidację każdego pola.
Ewaluator sprawdza również, czy przekazano rzeczywiste wcześniejsze odpowiedzi.

**Wypróbuj:** zmień poprawkę na kolor zielony i zaktualizuj oczekiwaną wartość.
**Uwaga:** historię czatu trzeba przesyłać ponownie; zużywa tokeny wejściowe
i może zawierać błędy z poprzednich odpowiedzi. To kontekst rozmowy, nie trwała
pamięć. Plan klasowy jest fikcyjny; nie są przechowywane profile osobowe.

**Infrastruktura:** wspólny GPT-4o i galeria; historia w uruchomionym kliencie.
**Dowody:** `results/15-multiturn.json` zawiera wszystkie trzy pełne żądania i odpowiedzi.
