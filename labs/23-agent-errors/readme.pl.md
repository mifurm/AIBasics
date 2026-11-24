# 23 — Odzyskaj sprawność po błędzie narzędzia

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Identyfikatory błędów pozostają oryginalne.

**8 minut.** Wymagania wstępne: laboratorium 20 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 23-agent-errors`.
2. Porównaj `temporarily_unavailable` z `unknown_item`.
3. Sprawdź ponowienie wyszukania zestawu robota po tymczasowym błędzie odczytu.
4. Sprawdź zmianę produktu po wyszukaniu nieznanego zestawu z brokatem.

**Oczekiwane:** jedno tymczasowe niepowodzenie, jedno ponowienie, następnie cena 23;
nieznany produkt zostaje zastąpiony zestawem papierowym w cenie 12.
Błędy pozostają w zapisanym śladzie wykonania.

**Wypróbuj:** wyjaśnij, dlaczego niezmienione ponowienia nie naprawią nieznanego
produktu w katalogu. Skrypt zatrzymuje powtarzane, niezmienione błędy trwałe
i ogranicza liczbę wszystkich wywołań narzędzi. Nie ponawia nieudanych zapisów
ani nie ukrywa błędów API Azure.

**Infrastruktura/dowody:** Azure GPT-4o i zadanie Azure; syntetyczne scenariusze
błędów działają w zadaniu, a nie przez zawodną usługę zewnętrzną.
Wyniki dostępne po uwierzytelnieniu są pobierane do `results/23-agent-errors.json`.
