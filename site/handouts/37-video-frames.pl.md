# 37 — Wideo to klatki w czasie

[English](37-video-frames.en.md) | [Polski](37-video-frames.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat obserwacji poniżej pozostaje oryginalnym dowodem.

**12 minut.** Wymagania wstępne: laboratorium 33;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy model potrafi określić kierunek obrotu koła o trzech szprychach
   na podstawie sześciu klatek.
2. Uruchom `npm run azure:agents -- 37-video-frames`.
3. Porównaj planszę klatek, odpowiedzi każdego modelu i koszt tokenów wejściowych
   sześciu oraz dwunastu klatek.

**Uczciwe zastrzeżenie:** jedyny model generowania wideo w Azure (Sora 2)
przekroczył datę wycofania 2026-11-02, więc generowanie wideo nie jest tutaj
możliwe. Laboratorium bada *rozumienie* wideo, czyli sposób, w jaki dzisiejsze
modele widzą wideo: jako krótką listę próbkowanych klatek.

**Co się dzieje:** nasz kod rysuje pięć klipów o dokładnie znanym ruchu:
piłkę poruszającą się z prawej na lewo w sześciu i w dwunastu klatkach;
sześć przetasowanych klatek piłki poruszającej się z lewej na prawo;
koło obracające się powoli (20 stopni na klatkę); oraz to samo koło próbkowane
zbyt rzadko (100 stopni na klatkę, nieodróżnialne od 20 stopni w przeciwną
stronę, ponieważ szprychy powtarzają się co 120 stopni). GPT-4o i GPT-5-mini
widzą każdą klatkę jako osobny obraz (dziesięć żądań).

**Oczekiwane:** więcej klatek proporcjonalnie zwiększa zużycie tokenów
wejściowych; pytania o kolejność i kierunek mają dokładne poprawne odpowiedzi;
w przypadku koła z aliasingiem same klatki są niejednoznaczne, więc nie można
ufać żadnemu modelowi w odtwarzaniu tego, co zaszło między nimi. W naszym
ostatnim wykonaniu GPT-5-mini poprawnie odpowiedział na każde pytanie
o kolejność i kierunek, a GPT-4o pomylił się w większości. Oba modele uznały,
że rzadko próbkowane koło obraca się zgodnie z ruchem wskazówek zegara:
tak je narysowaliśmy, ale nie to dosłownie pokazują klatki.
**Oryginalny dowód:**
> In our latest run GPT-5-mini answered every ordering and direction question correctly while
> GPT-4o missed most of them, and both models called the sparse wheel clockwise: that is how we drew it, but not what
> the frames literally show.

We wcześniejszym wykonaniu GPT-5-mini wskazał kierunek przeciwny dla tych samych
klatek, więc odpowiedzi różnią się między wykonaniami.

**Wypróbuj:** zmień `SPARSE_DEGREES` w `lib/genai/video-lab.mjs` ze 100 na 60
i przewidź wygląd koła o trzech szprychach (przy dokładnie 60 stopniach kierunki
zgodny i przeciwny do wskazówek zegara wyglądają identycznie; przy 120 stopniach
koło wydaje się nieruchome).

**Ograniczenia:** pięć maleńkich syntetycznych klipów i jedno wykonanie na model.
