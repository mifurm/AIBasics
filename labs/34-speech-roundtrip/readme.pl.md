# 34 — Dźwięk to próbki: mowa na wyjściu, mowa na wejściu

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat obserwacji poniżej pozostaje oryginalnym dowodem.

**12 minut.** Wymagania wstępne: laboratoria 06 i 31;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, przy jakim poziomie szumu system rozpoznawania mowy zacznie zawodzić i w jaki sposób.
2. Uruchom `npm run azure:agents -- 34-speech-roundtrip`.
3. Odtwórz każde nagranie, obejrzyj spektrogram i porównaj transkrypcję z oryginalnym zdaniem.

**Co się dzieje:** model Azure `tts` wypowiada jedno zdanie dwoma głosami
oraz z szybkością 1.5x (WAV, 24 kHz). Nasz kod mierzy próbki: czas trwania,
poziom sygnału, ciszę, tempo mowy i wysokość głosu. Spektrogramy powstają z FFT.
Do czystego nagrania dodawany jest biały szum z ustalonym ziarnem losowości
przy stosunkach sygnału do szumu 10, 0 i -10 dB, a Whisper transkrybuje
wszystko. Współczynnik błędów słów (zamiany, usunięcia, wstawienia) jest
obliczany względem przesłanego zdania.

**Oczekiwane:** większa szybkość skraca nagranie mniej więcej w tym samym
stosunku; czysta mowa jest rozpoznawana niemal idealnie; umiarkowany szum
prawie nie przeszkadza; przy bardzo silnym szumie system może zawieść,
*wymyślając płynny tekst* zamiast nie zwrócić niczego.
**Oryginalny dowód:** "we saw an entirely different sentence at -10 dB"
— przy -10 dB zaobserwowaliśmy zupełnie inne zdanie.

**Wypróbuj:** zmień `speechText` w `lib/genai/speech-lab.mjs`, dodając rzadkie
imię lub liczbę.

**Ograniczenia:** mowa syntetyczna, jedno zdanie, jedno wykonanie na warunek;
biały szum upraszcza rzeczywistość. Wdrożenia Standard `tts` i `whisper` mają
limit tempa (3 żądania na okno), dlatego klient czeka i ponawia żądania,
korzystając z nagłówka `Retry-After`.
