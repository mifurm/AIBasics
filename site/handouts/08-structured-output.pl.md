# 08 — Od języka do zweryfikowanych danych

[English](readme.md) | [Polski](readme.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**6 minut.** Wyodrębnij zamówienie, używając odpowiedzi zgodnej ze ścisłym schematem JSON.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/08-structured-output/demo.mjs`.
3. Sprawdź schemat: dokładnie `item` (ciąg znaków) i `quantity` (liczba całkowita).
4. Porównaj notatkę ze zwróconymi danymi.
5. Zmień notatkę w [promptach](../../lib/labs.mjs) i odpowiednie oczekiwane wartości
   w [ewaluatorze](../../lib/evaluate.mjs).

**Oczekiwane:** `{"item":"notebooks","quantity":3}` (kolejność właściwości może być inna).
Skrypt parsuje JSON, odrzuca dodatkowe właściwości i sprawdza wyodrębnione wartości.
Zgodność ze schematem nie oznacza poprawności faktów; możliwe są też odmowy i błędy API.

**Prompt do ćwiczeń — tłumaczenie dydaktyczne, nie wykonany wynik:**
„Wyodrębnij przedmiot i ilość z: «Please bring 3 notebooks to class.»”.
Notatka źródłowa pozostaje po angielsku, aby zachować dane przykładu i oczekiwane
`notebooks`; jej sens po polsku to „Proszę przynieść na zajęcia 3 zeszyty”.
To objaśnienie dydaktyczne, nie nowy zapis wykonania.

**Infrastruktura:** wspólny Azure GPT-4o z obsługą ustrukturyzowanych odpowiedzi; statyczna galeria.
**Dowody:** `results/08-structured-output.json`; laboratorium 08 w galerii; odpowiadające mu nagranie w prezentacji.
