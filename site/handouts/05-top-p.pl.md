# 05 — Top-p: zawężanie puli kandydatów

[English](05-top-p.en.md) | [Polski](05-top-p.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**7 minut.** Wyjaśnij próbkowanie jądrowe (nucleus sampling) na podstawie skumulowanych prawdopodobieństw tokenów.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/05-top-p/demo.mjs` (sześć żądań).
3. Porównaj trzy początki opowieści przy top-p 0.1 z trzema przy 1.
4. Oceń różnorodność, a następnie wypróbuj 0.5 w [promptach](../../lib/labs.mjs).

**Model myślowy:** gdyby prawdopodobieństwa kandydatów wynosiły 0.6, 0.3 i 0.1,
p=0.8 zachowałoby pierwszych dwóch, o skumulowanym prawdopodobieństwie 0.9.
To liczby ilustracyjne, a nie prawdopodobieństwa tokenów zmierzone w Azure.

**Oczekiwane:** węższa pula może ograniczyć różnorodność, ale ta mała próba nie
musi tego pokazać. Temperatura pozostaje na domyślnym ustawieniu API.
Zwykle zmieniaj tylko jeden parametr losowania naraz; top-p nie jest ustawieniem
prawdy ani inteligencji.

**Prompt do ćwiczeń — tłumaczenie dydaktyczne, nie wykonany wynik:**
„Wymyśl zaskakujący, jednozdaniowy początek opowieści o malutkim robocie w bibliotece”.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria.
**Dowody:** `results/05-top-p.json`; laboratorium 05 w galerii; odpowiadające mu nagranie w prezentacji.
