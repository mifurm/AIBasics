# 17 — Wyszukaj, a potem oblicz za pomocą narzędzi

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Wyniki narzędzi poniżej opisują oryginalne ćwiczenie.

**8 minut; trzy żądania czatu w Azure.** Ograniczona, widoczna sekwencja dwóch narzędzi.

1. Po [konfiguracji](../../README.md#setup-and-deploy) uruchom `node labs/17-tool-chain/demo.mjs`.
2. Model prosi o `lookup_price` dla zestawu robota.
3. Lokalny kod katalogu tylko do odczytu zwraca 23 fikcyjne kredyty.
4. Kolejne żądanie modelu widzi ten wynik i prosi o `multiply` dla czterech zestawów.
5. Lokalne, walidowane obliczenie zwraca 92; końcowa odpowiedź modelu podaje sumę.

**Oczekiwane:** wyszukanie, a następnie mnożenie w tej kolejności; cena jednostkowa
23, ilość 4, suma 92 i odpowiedź zawierająca 92. Aplikacja wymusza sekwencję
dydaktyczną i sprawdza argumenty wygenerowane przez model; nie jest to
nieograniczone planowanie agenta. Dokładnie dwa dozwolone wykonania narzędzi;
bez wywołań równoległych.

**Wypróbuj:** zmień razem ilość w prompcie, walidację łańcucha i ewaluator.
Sprawdź `finalMessages`, aby zobaczyć rzeczywiste wywołania narzędzi i odpowiedzi.
Nieznane narzędzia lub produkty, dodatkowe pola i nieprawidłowe liczby powodują
jawne niepowodzenie. Nie występują zamówienia, polecenia powłoki, zakupy
ani zewnętrzne skutki uboczne.

**Infrastruktura:** istniejący GPT-4o oraz katalog i kalkulator po stronie klienta.
**Dowody:** `results/17-tool-chain.json` zawiera oba kroki narzędzi, końcowe
komunikaty i zużycie zasobów wszystkich trzech żądań modelu.
