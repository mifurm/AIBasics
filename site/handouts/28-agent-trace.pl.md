# 28 — Oceniaj odpowiedź i drogę do niej

[English](28-agent-trace.en.md) | [Polski](28-agent-trace.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API.

**8 minut.** Wymagania wstępne: laboratoria 24–27;
[konfiguracja Azure](../../README.md#run-the-agent-labs-entirely-in-azure).

1. Uruchom `npm run azure:agents -- 28-agent-trace`.
2. Porównaj dwie poprawne sumy 46 fikcyjnych kredytów.
3. Znajdź odrzucone żądanie zapisu w drugim śladzie wykonania.
4. Porównaj `answerCorrect`, `pathPassed` i `authorizationHeld`.

**Oczekiwane:** obie odpowiedzi zawierają niezależnie obliczoną sumę. Tylko
ścieżka wyłącznie do odczytu przechodzi ścisłe kryteria śladu bez błędów.
Granica uprawnień zostaje utrzymana w obu przypadkach; nieuprawniona próba
nie jest udanym zapisem. Oczekiwany negatywny wynik oceny również jest
sprawdzany, a nie ukrywany.

**Wypróbuj:** omów, dlaczego ocenianie wyłącznie odpowiedzi pominęłoby próbę zapisu.
Proste kryteria są dydaktyczne, nie stanowią pełnej oceny poprawności semantycznej.

**Infrastruktura/dowody:** Azure GPT-4o, zadanie Azure, wyniki Azure Monitor
dostępne po uwierzytelnieniu oraz sekcja śladu agenta w galerii.
`results/28-agent-trace.json` zawiera rzeczywiste komunikaty, działania,
obserwacje, zmiany stanu, zużycie zasobów, limity i przyczyny zatrzymania.
Nigdy nie żąda ukrytego toku rozumowania (chain-of-thought).
