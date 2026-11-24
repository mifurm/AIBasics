# 29 — Tokeny: wyuczone fragmenty, nierówne koszty

[English](29-tokenization.en.md) | [Polski](29-tokenization.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat pomiaru poniżej jest oryginalnym dowodem, nie wynikiem polskiego uruchomienia.

**10 minut.** Wymagania wstępne: laboratoria 06 i 00;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, które z ośmiu tłumaczeń jednego zdania zużyje najwięcej tokenów.
2. Uruchom `npm run azure:agents -- 29-tokenization`.
3. Przeczytaj scalenia demonstracyjnego kodowania par bajtów, a następnie
   zmierzone liczby tokenów.
4. Porównaj te same zdania w GPT-4o i GPT-5-mini.

**Co się dzieje:** deterministyczny algorytm uczący kodowania par bajtów (BPE)
uczy się scaleń z jedenastu słów używanych na zajęciach. Widać, jak częste pary
stają się pojedynczymi tokenami i jak nieznane słowo rozpada się na mniejsze
fragmenty. Następnie 27 małych żądań czatu w Azure (`max_tokens` 1) mierzy
rzeczywiste liczby tokenów: od raportowanych tokenów promptu odejmowany jest
stały narzut czatu skalibrowany komunikatem `a`, mającym jeden token.
Porównywane są osiem języków, liczby, kod, emoji, adresy URL, powtarzane litery
i białe znaki.

**Oczekiwane:** to samo znaczenie nie kosztuje tej samej liczby tokenów w każdym
języku, a liczba znaków słabo wskazuje koszt. W jednym wykonaniu japoński zużył
1.33x tokenów angielskiego przy około 2.7x mniejszej liczbie znaków.
**Oryginalny dowód:** "one run: Japanese used 1.33x English's tokens with about 2.7x fewer
characters". W naszym wykonaniu oba modele podały identyczne liczby, ale nie
zakładaj tego dla innych modeli.

**Wypróbuj:** dodaj zdanie w swoim języku do `languageSentences` w
`lib/genai/tokenization-lab.mjs`, wdróż ponownie i porównaj jego koszt z angielskim.

**Ograniczenia:** demonstracyjny tokenizer uczy się z jedenastu słów; prawdziwe
tokenizery uczą się z ogromnych korpusów. Mierzymy liczby tokenów, nie ceny,
i nie mówi to nic o jakości w danym języku. `node labs/29-tokenization/demo.mjs`
jest opcjonalną alternatywą lokalną z wnioskowaniem w Azure, a nie wykonaniem
w całości w Azure.
