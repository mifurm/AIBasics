# 32 — Od promptu do pikseli

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat poniżej to oryginalny prompt, nie polskie żądanie wykonane w API.

**12 minut.** Wymagania wstępne: laboratorium 01;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy dwie próbki tego samego promptu będą tym samym obrazem.
2. Uruchom `npm run azure:agents -- 32-image-generation`.
3. Porównaj pomiary pikseli, dwie próbki i ogólny prompt.

**Co się dzieje:** `gpt-image-1.5` generuje trzy pliki PNG 1024x1024 niskiej
jakości: dwukrotnie precyzyjny prompt układu („czerwone koło po lewej, niebieski
kwadrat po prawej, jednolite białe tło”) oraz prompt ogólny.
Oryginalny prompt: "a red circle on the left, a blue square on the right, plain white background".
Nasz kod dekoduje każdy PNG i **mierzy** go: udział czerwieni i błękitu, położenie
środków, udział bieli oraz różnice między dwiema próbkami. GPT-4o osobno opisuje
każdy obraz jako drugą, niezależną kontrolę. Laboratorium odczytuje także
kontener PNG i raportuje jego blok C2PA Content Credentials (`caBX`).

**Oczekiwane:** każde wywołanie obrazu raportuje tokeny obrazu; ten sam prompt
daje wyraźnie różne obrazy; ogólny prompt pozostawia modelowi wybór stylu,
kolorów i obiektów; kontrole pikseli i opis GPT-4o można porównać z zamówionym efektem.

**Wypróbuj:** zmień `specificPrompt` w `lib/genai/image-generation-lab.mjs`
i zaktualizuj kontrole kolorów w `lib/media/color-layout.mjs`.

**Ograniczenia:** trzy obrazy nie są testem statystycznym; proste kontrole
kolorów pasują tylko do prostych promptów; model opisujący obraz też może się
mylić. Każde wykonanie generuje trzy obrazy (opłata za obraz). Zbyt duże obrazy
są ponownie kodowane w mniejszym rozmiarze do galerii; pomiary zawsze
wykorzystują oryginał.
