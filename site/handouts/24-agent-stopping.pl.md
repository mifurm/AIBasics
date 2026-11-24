# 24 — Wiedz, kiedy się zatrzymać

[English](24-agent-stopping.en.md) | [Polski](24-agent-stopping.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Wartości stanu poniżej pozostają oryginalne.

**8 minut.** Wymagania wstępne: laboratorium 20 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 24-agent-stopping`.
2. Porównaj ukończone obliczenie sumy, niemożliwy do spełnienia budżet i limit
   jednego wykonania narzędzia.
3. Sprawdź `stopReason`, `requestCount` i `toolExecutionCount`.
4. Znajdź żądanie ponad limit oznaczone `executed: false`.

**Oczekiwane:** odrębne wyniki `completed`, `impossible` i `tool_limit`.
Stwierdzenie niemożliwości wymaga obserwacji obu produktów w katalogu.
Limit to jawne zatrzymanie przez aplikację, nie odpowiedź wygenerowana przez Azure
ani dowód niemożliwości.

**Wypróbuj:** zwiększ `maxToolCalls` w przypadku z limitem i zaktualizuj oczekiwanie.

**Infrastruktura/dowody:** Azure GPT-4o, zadanie Azure i logi Azure Monitor dostępne
po uwierzytelnieniu. `results/24-agent-stopping.json` zapisuje rzeczywiste zużycie
zasobów każdego żądania. Domyślne limity to sześć wykonań narzędzi, siedem żądań
modelu i 320 tokenów wyjściowych na żądanie. Nie wymuszają one limitu wydatków w dolarach.
