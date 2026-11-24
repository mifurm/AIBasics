# 36 — Muzyka to tokeny

[English](36-music-tokens.en.md) | [Polski](36-music-tokens.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Format nut pozostaje oryginalny.

**12 minut.** Wymagania wstępne: laboratoria 00 i 04;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, który kompozytor najczęściej porusza się małymi krokami
   i co zmieni wyższa temperatura.
2. Uruchom `npm run azure:agents -- 36-music-tokens`.
3. Posłuchaj czterech melodii, odczytaj widoki piano roll i porównaj pomiary z teorii muzyki.

**Uczciwe zastrzeżenie:** Azure nie oferuje modelu generowania muzyki w katalogu
tej subskrypcji. Dlatego laboratorium uczy wspólnej idei (zapisz muzykę jako
tokeny, przewiduj następny token) za pomocą nut symbolicznych: **nie** tak
działają modele audio, takie jak MusicGen czy Lyria.

**Co się dzieje:** melodie są listami zdarzeń `PITCH:eighth-note-duration`,
wypełniających dokładnie 32 miejsca (cztery takty). Tworzy je czterech
kompozytorów: losowe nuty; maleńki model następnej nuty (bigramowy) wytrenowany
na dziewięciu uproszczonych frazach z domeny publicznej przy temperaturach
0.7 i 1.6 (po 30 melodii z ustalonym ziarnem losowości); oraz GPT-4o z promptem
w tym samym formacie (pięć próbek w jednym żądaniu, jedynym wywołaniu API).
Syntezator renderuje każdą melodię do pliku WAV, a algorytm śledzenia wysokości
dźwięku sprawdza, czy **dźwięk** odpowiada zapisanym nutom. Punktem odniesienia
są statystyki dziewięciu utworów.

**Oczekiwane:** losowe nuty wykonują duże skoki, wytrenowany model porusza się
głównie krokowo, podobnie do melodii treningowych, a wyższa temperatura
zwiększa różnorodność (więcej różnych tokenów, mniej dosłownego kopiowania),
nie wymyślając nowego stylu.

**Wypróbuj:** zastąp jedną z dziewięciu fraz w `corpus` w `lib/genai/music-lab.mjs`
inną frazą z domeny publicznej, mającą dokładnie 32 miejsca na ósemki.

**Ograniczenia:** dziewięć fraz, prosty syntezator i pomiary, które nic nie
mówią o tym, czy melodia jest piękna.
