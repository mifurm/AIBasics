# 30 — Rzeczywiste prawdopodobieństwa modelu

[English](30-logprobs.en.md) | [Polski](30-logprobs.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Angielskie cytaty poniżej oznaczają oryginalne prompty lub tokeny.

**10 minut.** Wymagania wstępne: laboratoria 04, 05 i 00;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy „wybierz losową liczbę od 1 do 10” daje równomierny rozkład
   dziesięciu liczb. Oryginalny tekst: "pick a random number from 1 to 10".
2. Uruchom `npm run azure:agents -- 30-logprobs`.
3. Odczytaj rzeczywiste prawdopodobieństwa dziesięciu najczęstszych następnych
   tokenów dla czterech promptów.
4. Sprawdź przewidywanie wpływu temperatury względem 100 rzeczywistych próbek na temperaturę.

**Co się dzieje:** GPT-4o otrzymuje prośbę o dokładnie jeden token z włączonym
`logprobs`. Każde logarytmiczne prawdopodobieństwo jest przekształcane przez
`exp()` w prawdopodobieństwo. Dla promptu "random 1 to 100" („losowa od 1 do 100”)
laboratorium następnie **przewiduje** wpływ temperatur 0.3, 1 i 2: podnosi każde
prawdopodobieństwo do potęgi 1/T i ponownie normalizuje. Porównuje to ze
100 rzeczywistymi próbkami dla każdej temperatury (po jednym żądaniu, `n=100`).
GPT-5-mini również otrzymuje prośbę o logarytmiczne prawdopodobieństwa;
odmowa Azure zostaje zapisana dokładnie tak, jak ją zwrócono.

**Oczekiwane:** token "Paris" jest niemal pewny; „losowa” liczba od 1 do 10
wcale nie jest losowa (jedna liczba dominuje), liczba od 1 do 100 rozkłada się
między kilka ulubionych wartości, a otwarta opowieść ma długi ogon możliwych
pierwszych słów. Przewidywanie wpływu temperatury jest bliskie rzeczywistości,
ale niedokładne: znamy tylko dziesięć najczęstszych tokenów, więc brakuje
niewidocznego ogona, który wyższa temperatura także wzmacnia.

**Wypróbuj:** dodaj prompt do `logprobPrompts` w `lib/genai/logprobs-lab.mjs`
i przewidź, czy rozkład będzie skupiony, czy płaski.

**Ograniczenia:** prawdopodobieństwa to wyniki dla następnego tokenu, nie fakty
ani skalibrowana pewność. Modele rozumujące nie udostępniają logarytmicznych
prawdopodobieństw. Wyniki nieznacznie różnią się między wykonaniami.
