# 19 — Przepływ pracy czy agent?

[English](19-workflow-agent.en.md) | [Polski](19-workflow-agent.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**8 minut.** Wymagania wstępne: laboratoria 11 i 17;
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Przewidź, jakich narzędzi wymagają pytanie o cenę jednostkową, sumę koszyka i powitanie.
2. Uruchom `npm run azure:agents -- 19-workflow-agent`.
3. Porównaj wymuszoną sekwencję wyszukiwania i obliczania z trzema śladami
   wykonania wybranymi przez model.
4. Sprawdź `agentTrace.events`, rzeczywiste komunikaty narzędzi i zużycie zasobów żądań.

**Oczekiwane:** przepływ pracy wyszukuje, a następnie oblicza; agent używa
wyszukiwania dla ceny, wyszukiwania i obliczania dla sumy 46 oraz żadnych narzędzi
dla powitania. Aplikacja nadal wykonuje i waliduje każde żądanie.

**Wypróbuj:** zastąp powitanie innym pytaniem niewymagającym faktów z katalogu.
Nie zmieniaj przypadku przepływu pracy, aby zachować podstawę porównania.

**Infrastruktura:** Azure GPT-4o i ręcznie uruchamiane zadanie Azure Container Apps Job;
prywatne logi Azure Monitor zachowują wyniki. Nie jest potrzebny framework
agentowy ani dodatkowy model. `node labs/19-workflow-agent/demo.mjs` jest
opcjonalną alternatywą lokalną z wnioskowaniem w Azure, a nie wykonaniem w całości w Azure.
