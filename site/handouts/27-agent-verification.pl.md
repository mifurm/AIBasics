# 27 — Sprawdź wynik, nie deklarację

[English](27-agent-verification.en.md) | [Polski](27-agent-verification.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Identyfikatory wyników kontroli pozostają oryginalne.

**8 minut.** Wymagania wstępne: laboratoria 20 i 24;
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 27-agent-verification`.
2. Sprawdź pierwszą propozycję: trzy zestawy robota kosztują 69, ponad budżet 50.
3. Znajdź deterministyczny wynik `over_budget`.
4. Prześledź poprawkę na trzy zestawy papierowe i udaną kontrolę sumy 36.

**Oczekiwane:** nieprawidłowa propozycja nie trafia do stanu wybranego koszyka.
Tylko poprawny koszyk aktualizuje wybór i zweryfikowaną sumę. Zakończenie bez
poprawnej kontroli jest jawnie oznaczane `unverified` i nie przechodzi kontroli laboratorium.

**Wypróbuj:** obniż budżet poniżej 36; omów różnicę między poprawką a niemożliwością.

**Infrastruktura/dowody:** Azure GPT-4o i deterministyczny kod sprawdzający
wewnątrz zadania Azure. Wyniki dostępne po uwierzytelnieniu są pobierane do
`results/27-agent-verification.json`. Kod sprawdza ten katalog i te ograniczenia,
a nie dowolną prawdziwość twierdzeń.
