# 31 — Znaczenie jako geometria

[English](31-embedding-space.en.md) | [Polski](31-embedding-space.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Słowo testowe "bank" pozostaje oryginalne.

**10 minut.** Wymagania wstępne: laboratorium 18;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, które zdania znajdą się blisko siebie na mapie 2D.
2. Uruchom `npm run azure:agents -- 31-embedding-space`.
3. Przeanalizuj mapę, tabelę tłumaczeń, pułapkę słowa "bank" i porównanie krótszych wektorów.

**Co się dzieje:** dwa żądania embeddingów przekształcają 28 zdań (12 angielskich,
ich 12 polskich tłumaczeń i 4 zdania sondujące) w wektory: raz pełnej długości,
a raz z `dimensions=256`. Kod mierzy podobieństwo cosinusowe, znajduje
najbliższego sąsiada każdego zdania, wyszukuje każde tłumaczenie między językami
i rzutuje wektory za pomocą PCA na dwa wymiary, tworząc mapę SVG.

**Oczekiwane:** zdania o tym samym temacie są bliżej niż zdania o różnych tematach;
każde polskie zdanie jest najbliżej swojego angielskiego tłumaczenia; zdanie
dzielące z zapytaniem *znaczenie* wyprzedza zdanie dzielące jedynie słowo "bank";
język pozostawia własny ślad (pary w tym samym języku są bliżej niż pary
międzyjęzykowe); a 256 liczb zachowuje większość struktury podobieństwa.

**Wypróbuj:** zastąp jeden temat własnym i napisz tłumaczenia w znanym sobie języku.

**Ograniczenia:** dwanaście ręcznie napisanych zdań to ilustracja, nie benchmark.
Mapa 2D odrzuca większość informacji. Embeddingi ujmują sceny i język, nie tylko
temat, dlatego zdanie może znaleźć się między grupami.
