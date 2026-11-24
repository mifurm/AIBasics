# 33 — Co widzi model wizyjny

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat pomiaru poniżej pozostaje oryginalnym dowodem.

**12 minut.** Wymagania wstępne: laboratoria 08 i 12;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy model potrafi policzyć dziewiętnaście kolorowych figur
   i odczytać kod o wysokości zaledwie 7 pikseli.
2. Uruchom `npm run azure:agents -- 33-vision`.
3. Porównaj odpowiedź JSON każdego modelu ze znanymi poprawnymi danymi, pole po polu.
4. Porównaj niski i wysoki poziom szczegółowości obrazu: poprawność względem tokenów wejściowych.

**Co się dzieje:** nasz kod rysuje trzy obrazy ze znanymi odpowiedziami
(figury z ustalonym ziarnem losowości i elementami rozpraszającymi, wykres
słupkowy, duży i maleńki kod tekstowy). GPT-4o i GPT-5-mini otrzymują ten sam
obraz i prompt ze ścisłym schematem JSON (osiem żądań). Każde pole jest oceniane
automatycznie, a koszt tokenowy obrazu zapisywany.

**Oczekiwane:** błędne liczenie podobnych obiektów i odczytywanie maleńkiego
tekstu to widoczne rzeczywiste błędy, nie opinie. Większa szczegółowość obrazu
zużywa więcej tokenów wejściowych — **oryginalny dowód:** "in our latest run 5.4x for GPT-4o and 2.0x for GPT-5-mini".
Nie zawsze pomaga: naprawiła odczyt maleńkiego kodu w GPT-5-mini, ale nie
w GPT-4o. Model może odpowiedzieć poprawnie w jednym wykonaniu, a błędnie w następnym.

**Wypróbuj:** dodaj więcej elementów rozpraszających do `SHAPES_SPEC`
w `lib/genai/vision-lab.mjs` i obserwuj liczenie.

**Ograniczenia:** trzy syntetyczne obrazy i jedno wykonanie na model;
prawdziwe fotografie zachowują się inaczej. Wyniki różnią się między wykonaniami.
