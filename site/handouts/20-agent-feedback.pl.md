# 20 — Działaj, obserwuj, powtarzaj

[English](20-agent-feedback.en.md) | [Polski](20-agent-feedback.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**8 minut.** Wymagania wstępne: laboratorium 19 i
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 20-agent-feedback`.
2. Sprawdź pierwsze wyszukanie: w tych danych testowych zapas zestawów robota wynosi zero.
3. Prześledź następne żądanie modelu: otrzymuje rzeczywistą obserwację narzędzia.
4. Znajdź wyszukanie zestawu papierowego i niezależną kontrolę koszyka.

**Oczekiwane:** wybrany koszyk zmienia się na dwa zestawy papierowe, kosztuje
24 fikcyjne kredyty i przechodzi kontrolę dostępności oraz budżetu.
Model nie może zmienić stanu magazynowego.

**Wypróbuj:** zmień dane testowe niedostępnego produktu w `lib/agent.mjs`
i odpowiadającą im kontrolę; wdróż źródła ponownie przed uruchomieniem w Azure.

**Infrastruktura/dowody:** istniejący Azure GPT-4o, zadanie Azure i wyniki
Azure Monitor dostępne po uwierzytelnieniu; pobrany `results/20-agent-feedback.json`
zawiera pełną rozmowę oraz stan przed i po wykonaniu. Nie ma tu sklepu ani rzeczywistego zakupu.
