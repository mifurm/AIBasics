# 11 — Model prosi, kod oblicza

[English](11-tools.en.md) | [Polski](11-tools.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**7 minut.** Prześledź pętlę wywołania narzędzia obejmującą dwa żądania.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/11-tools/demo.mjs` (dwa żądania do modelu).
3. Sprawdź argumenty `multiply` wygenerowane przez model: ilość 17 i cena jednostkowa 23.
4. [Lokalny kod z listy dozwolonych narzędzi](../../lib/tools.mjs) weryfikuje je i oblicza 391.
5. Skrypt odsyła wynik narzędzia do modelu; model pisze odpowiedź w jednym zdaniu.
6. Zmień liczby w [prompcie](../../lib/labs.mjs) i oczekiwane wartości
   w [ewaluatorze](../../lib/evaluate.mjs).

**Oczekiwane:** suma w śladzie narzędzia = 391; końcowa odpowiedź zawiera 391.
Obie rzeczy są sprawdzane. Model wybiera ustrukturyzowane argumenty, ale nie
wykonuje dowolnego kodu. Nieznane narzędzia, dodatkowe pola, wartości ujemne,
ułamkowe i większe niż 10 000 są odrzucane. Wszystkie ceny są wyrażone
w fikcyjnych kredytach. Nie dochodzi do zakupów.

**Prompt do ćwiczeń — tłumaczenie dydaktyczne, nie wykonany wynik:**
„Potrzebujemy 17 zestawów do budowy robotów po 23 kredyty każdy. Użyj narzędzia
multiply, a następnie podaj sumę w jednym zdaniu”.

**Infrastruktura:** wspólny Azure GPT-4o; deterministyczne narzędzie działa po stronie klienta.
**Dowody:** `results/11-tools.json` obejmuje zużycie dla obu żądań i ślad narzędzia;
laboratorium 11 w galerii; odpowiadające mu nagranie w prezentacji.
