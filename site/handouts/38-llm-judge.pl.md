# 38 — Czy model może oceniać model?

[English](38-llm-judge.en.md) | [Polski](38-llm-judge.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat pomiaru i etykieta "tie" pozostają oryginalne.

**14 minut.** Wymagania wstępne: laboratoria 12 i 24;
[konfiguracja Azure](../../README.md#run-the-advanced-genai-labs-entirely-in-azure).

1. Przewidź, czy model oceniający można oszukać dłuższą, bardziej pewną siebie
   błędną odpowiedzią.
2. Uruchom `npm run azure:agents -- 38-llm-judge`.
3. Porównaj kartę wyników każdego sędziego, a następnie test pozycji z wymuszonym wyborem.

**Co się dzieje:** dwóch sędziów (GPT-4o i GPT-5-mini) ocenia 10 par odpowiedzi,
każdą w obu kolejnościach (po 20 werdyktów): sześć pytań z jedną poprawną
i jedną błędną odpowiedzią (trzy, w których błędna jest dłuższa i brzmi pewnie)
oraz cztery z dwiema równie dobrymi odpowiedziami. Prawda jest weryfikowana
niezależnymi obliczeniami. Ostatni warunek usuwa opcję "tie" (remis)
i wymusza wybór między równie dobrymi odpowiedziami, bezpośrednio mierząc
stronniczość pozycyjną (16 kolejnych werdyktów). Całe laboratorium wykonuje 56 żądań.

**Oczekiwane:** sędziego może oszukać błędna odpowiedź wyglądająca autorytatywnie;
może on wydawać się bezstronny, gdy wolno mu powiedzieć "tie", ale faworyzować
pierwszą odpowiedź przy wymuszonym wyborze. W naszych wykonaniach 50-88%
wymuszonych wyborów wskazywało pierwszą odpowiedź, przy tylko ośmiu werdyktach
na sędziego: traktuj to jako ilustrację, nie zmierzoną częstość. Dwaj sędziowie się różnią.
**Oryginalny dowód:**
> in our runs 50-88% of forced picks went to
> the first-listed answer, from only eight verdicts per judge, so treat that as an illustration, not a measured rate

**Wypróbuj:** dodaj do `truthPairs` w `lib/genai/judge-lab.mjs` parę, w której
poprawna odpowiedź jest dłuższa.

**Ograniczenia:** dziesięć prostych par i jedno wykonanie na sędziego wystarcza,
by zilustrować kontrole, nie by ustalić ranking modeli. Gdy używasz modelu
do oceniania, zachowuj próbkę sprawdzoną przez człowieka i oceniaj obie kolejności.
