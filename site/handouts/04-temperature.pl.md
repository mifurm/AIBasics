# 04 — Temperatura: różnorodność czy powtarzalność

[English](readme.md) | [Polski](readme.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**7 minut.** Obserwuj zmienność losowania, a nie gwarantowany efekt.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/04-temperature/demo.mjs` (sześć żądań).
3. Porównaj trzy nazwy koła robotycznego przy temperaturze 0 z trzema przy 1.2.
4. Policz unikalne odpowiedzi w każdej grupie; skrypt zapisuje te liczby.
5. Powtórz z [tymi samymi promptami](../../lib/labs.mjs) i omów wielkość próby.

**Oczekiwane:** wyższa temperatura często zwiększa różnorodność. Trzy próbki nie
mogą dowieść tego efektu. Przy zerze też mogą wystąpić różnice; temperatura nie
zwiększa inteligencji ani nie gwarantuje prawdziwości odpowiedzi.
Przez cały czas top-p pozostaje na domyślnym ustawieniu API.

**Prompt do ćwiczeń — tłumaczenie dydaktyczne, nie wykonany wynik:**
„Wymyśl jedną zabawną, dwuwyrazową nazwę szkolnego koła robotycznego. Zwróć tylko nazwę”.

**Infrastruktura:** wspólny Azure GPT-4o; GPT-5-mini nie obsługuje tych ustawień.
**Dowody:** `results/04-temperature.json`; laboratorium 04 w galerii; odpowiadające mu nagranie w prezentacji.
