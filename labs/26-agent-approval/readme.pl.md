# 26 — Zatwierdź dokładnie określoną czynność

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**8 minut.** Wymagania wstępne: laboratorium 25 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 26-agent-approval`.
2. Porównaj zaprogramowane zatwierdzenie i odrzucenie dwóch zestawów papierowych.
3. Porównaj żądanie trzech zestawów z zatwierdzeniem tylko dwóch.
4. W każdym wyniku sprawdź migawkę zatwierdzenia i syntetyczną listę rezerwacji.

**Oczekiwane:** tylko zatwierdzenie dokładnie tego produktu i tej ilości tworzy
szkic rezerwacji. Odrzucenie i zmienione argumenty pozostawiają magazyn pusty.
Zduplikowane szkice w jednym przypadku również są blokowane.

**Wypróbuj:** zmień zatwierdzony produkt, pozostawiając żądanie bez zmian.

**Infrastruktura/dowody:** Azure GPT-4o, zadanie Azure i zapis syntetycznego
magazynu rekordów wykonania w Azure Monitor z dostępem po uwierzytelnieniu.
`results/26-agent-approval.json` zawiera wszystkie trzy przypadki.
Są to oznaczone decyzje testowe, nie produkcyjny interfejs zatwierdzania przez
człowieka, kontrola tożsamości ani usługa zatwierdzania.
