# 25 — Uprawnienie do odczytu nie jest uprawnieniem do zapisu

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Nazwy narzędzi i obserwacji pozostają oryginalne.

**7 minut.** Wymagania wstępne: laboratorium 19 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 25-agent-permissions`.
2. Sprawdź udane wyszukanie ceny tylko do odczytu.
3. Sprawdź żądane `reserve_draft` i obserwację `permission_denied`.
4. Sprawdź, czy syntetyczna lista rezerwacji jest pusta.

**Oczekiwane:** odczyt się udaje; zapis nie zostaje wykonany. Narzędzie jest
celowo udostępnione modelowi, aby uczniowie mogli zobaczyć, jak kod egzekwuje
granicę nawet wtedy, gdy model żąda zabronionej czynności.

**Wypróbuj:** wyjaśnij, dlaczego mocniejsze sformułowanie promptu nie może nadać
uprawnienia do narzędzia.

**Infrastruktura/dowody:** Azure GPT-4o i zadanie Azure; wyniki dostępne
po uwierzytelnieniu są pobierane do `results/25-agent-permissions.json`.
Uprawnienia narzędzi aplikacji są odrębne od Azure RBAC. Nie ma rzeczywistych
rezerwacji ani zapisów w systemach zewnętrznych.
