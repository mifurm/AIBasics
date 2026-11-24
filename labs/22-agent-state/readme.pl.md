# 22 — Zachowuj aktualny stan zadania

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**8 minut.** Wymagania wstępne: laboratoria 15 i 19;
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 22-agent-state`.
2. Sprawdź zweryfikowany pierwszy koszyk: dwa zestawy papierowe, budżet 50, suma 24.
3. Druga tura ponownie przesyła rzeczywiste wygenerowane odpowiedzi i zmienia ilość na 3.
4. Sprawdź unieważnioną starą sumę i nową kontrolę koszyka.

**Oczekiwane:** produkt i budżet zostają zachowane; ilość wynosi teraz 3,
a zweryfikowana suma 36. Poprzednia migawka stanu pozostaje niezmieniona.
Stan należy do aplikacji; nie wnioskujemy o nim z deklaracji asystenta, że pamięta.

**Wypróbuj:** zmień poprawkę, zaktualizuj oczekiwania i wdróż ponownie.

**Infrastruktura/dowody:** Azure GPT-4o, zadanie Azure i wyniki Azure Monitor
dostępne po uwierzytelnieniu. `results/22-agent-state.json` zachowuje obie tury
i migawki stanu. Jest to stan ograniczony do wykonania, nie trwała pamięć osobista.
