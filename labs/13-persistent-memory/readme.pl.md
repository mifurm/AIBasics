# 13 — Pamięć przetrwa uruchomienie nowego procesu

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Literały odpowiedzi poniżej pochodzą z oryginalnego ćwiczenia.

**6 minut; dwa żądania czatu w Azure.** Przewidź, czy samo zapisanie pliku pozwoli
modelowi poznać fakt dotyczący klasy.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/13-persistent-memory/demo.mjs`.
3. Aplikacja zapisuje fikcyjną maskotkę Otter, ale nie przesyła jej w pierwszym
   żądaniu. Oczekiwana odpowiedź: `UNKNOWN`.
4. Osobny proces Node odczytuje plik, a skrypt uruchamiający wstawia jego zawartość
   do nowego żądania. Oczekiwana odpowiedź: `Otter`.
5. Sprawdź `results/memory/13-persistent-memory.json` i zapisane identyfikatory procesów.

**Co naprawdę pamięta?** Plik JSON zarządzany przez aplikację. Wagi modelu
nie są aktualizowane, a Azure nie zapamiętuje automatycznie poprzedniego czatu.
Każde żądanie modelu zaczyna od nowa; drugie otrzymuje jawnie przekazaną migawkę
pamięci. To nie jest GitHub Copilot Memory i nie przechowuje danych prawdziwego ucznia.

**Wypróbuj:** zmień razem maskotkę w skrypcie i odpowiadającą jej walidację.
Proces roboczy celowo akceptuje wyłącznie fikcyjne wartości demonstracyjne.

**Infrastruktura:** istniejący GPT-4o, lokalny magazyn JSON, wspólna galeria statyczna.
**Dowody:** `results/13-persistent-memory.json` zawiera migawkę przekazaną lub
nieprzekazaną do modelu oraz identyfikatory osobnych procesów roboczych.
Automatyczne kontrole weryfikują obie odpowiedzi.
