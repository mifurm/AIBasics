# 12 — Te same prompty, różne modele

[English](12-models.en.md) | [Polski](12-models.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**12 minut.** Porównaj GPT-4o i GPT-5-mini, używając trzech znajomych zadań
i dwóch stylów promptu. To rozszerzenie pierwotnego pojedynczego pytania
o harmonogram; nie wymaga nowego wdrożenia modelu ani usługi Azure.

## Uruchom w całości w Azure

Po [wspólnej konfiguracji Azure](../../README.md#run-the-agent-labs-entirely-in-azure):

```sh
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 12-models
npm run gallery
npm run deck -- --allow-missing-recordings
npm run publish -- --include-deck
npm run verify
```

Opcjonalny skrypt lokalny, korzystający z wnioskowania modeli w Azure:
`node labs/12-models/demo.mjs`. Każde wykonanie wysyła **12 płatnych żądań czatu**,
po sześć do każdego modelu. Ponowne uruchomienie nadpisuje zapisane wyniki
laboratorium. Polecenie wykonania w całości w Azure powoduje dodatkowo zwykłe
opłaty za zadanie i monitorowanie.

## Sześć porównań, dwanaście rzeczywistych odpowiedzi

| Zadanie | Prompt ogólny | Prompt precyzyjny | Co sprawdzić |
| --- | --- | --- | --- |
| Wyjaśnienie pojęcia | Wyjaśnij generowanie tekstu w mniej niż 100 słowach | Wyjaśnij dziesięciolatkowi w dwóch punktach, najwyżej 45 słowach, wspominając tokeny i kontekst | Sformułowania, dopasowanie do odbiorcy, poprawność, długość |
| Wyodrębnienie informacji | Powiedz, co przynieść, na podstawie notatki klasowej | Zwróć wyłącznie dokładny JSON z przedmiotem i całkowitą ilością | Proza a dane do przetwarzania maszynowego; poprawne wartości |
| Przestrzeganie ograniczeń | Ułóż harmonogram trzech pokazów według podanych warunków | Rozwiąż te same warunki w dokładnie trzech numerowanych wierszach | Poprawna kolejność, format, zwięzłość |

W każdej parze **cała lista komunikatów jest identyczna**. Zmieniają się tylko
model i obsługiwana przez niego konfiguracja API. Między wariantem ogólnym
a precyzyjnym zadanie i fakty źródłowe pozostają takie same, ale instrukcje
stają się bardziej jednoznaczne. Nie wykorzystujemy wcześniejszej odpowiedzi
ani historii rozmowy.

1. Przed uruchomieniem przewidź możliwe różnice.
2. W galerii wybierz zadanie oraz prompt ogólny lub precyzyjny.
3. Przeczytaj odpowiedzi obu modeli obok siebie, pod wspólnym promptem.
4. Porównaj rzeczywiste wersje modeli, opóźnienie, tokeny wejścia/odpowiedzi/łącznie,
   raportowane tokeny rozumowania, liczbę widocznych słów i ustawienia API.
5. Przełącz na precyzyjniejszy prompt i omów, co się poprawiło, a co pozostało takie samo.

**Obsługiwane konfiguracje nie są identyczne:** GPT-4o używa temperatury 0
i limitu 320 tokenów odpowiedzi. GPT-5-mini używa niskiego nakładu rozumowania
(`reasoning_effort: low`) i całkowitego limitu odpowiedzi 1 400 tokenów,
obejmującego wewnętrzne rozumowanie. Ten model nie akceptuje ustawień losowania
z GPT-4o. Galeria ujawnia te różnice, zamiast udawać idealnie kontrolowany
benchmark, w którym zmieniono wyłącznie model.

## Oceniaj wynik, nie etykietę

Każda karta zawiera proste kontrole względem **celów promptu precyzyjnego**:

- Wyjaśnienie: dwa wiersze z punktami, najwyżej 45 słów rozdzielonych białymi
  znakami oraz słowa kluczowe dotyczące tokenów i kontekstu. Kontrole te nie
  dowodzą poprawności merytorycznej ani dopasowania do odbiorcy. W oryginalnym
  ewaluatorze sprawdzane są angielskie `token`/`tokens` oraz `context`.
- Ekstrakcja: samodzielny JSON, dokładnie `item` i `quantity`, `"notebooks"`,
  liczba całkowita `3` i brak dodatkowych pól.
- Harmonogram: dokładnie `1: plant`, `2: robot`, `3: art` w osobnych wierszach.

Prompt ogólny **nie wymagał** spełnienia każdego z tych celów. Ekstrakcja prozą
lub poprawny harmonogram w innym formacie może więc wykazywać niezgodność
z celem, mimo że odpowiedź nie jest błędna. Każda para zawiera kryteria
do ręcznej oceny znaczenia.

### Kryteria ręcznej oceny

Poniższe kryteria są tłumaczeniami dydaktycznymi kryteriów w
`lib/model-comparison.mjs`, a nie dodatkowymi wykonanymi ocenami:

- **Wyjaśnienie:** czy jest poprawne, zrozumiałe dla dziesięciolatka i wolne
  od mylących stwierdzeń? Sama obecność słów kluczowych nie dowodzi poprawności.
- **Ekstrakcja:** czy odpowiedź zachowuje przedmiot i ilość? Odpowiedź prozą
  może być poprawna, nawet jeśli nie spełnia doprecyzowanego celu JSON.
- **Harmonogram:** sprawdź znaczenie, nie tylko format: każdy pokaz występuje
  raz; plant jest bezpośrednio przed robot; art nie jest pierwszy.
  Jedyne rozwiązanie to plant, robot, art.

Niezgodności jakości i formatu są zachowywane i wyświetlane; skrypt nigdy
nie zmienia odpowiedzi, aby przedstawić model korzystniej. Oddzielne kontrole
eksperymentu wymagają kompletnych par odpowiedzi, identycznych promptów,
różnych wdrożeń/wersji modeli, dowodów zużycia i wiernie obliczonych kontroli
celów. Awarie infrastruktury, ucięcie odpowiedzi i brak dowodów oznaczają jawne
niepowodzenie, a nie udane porównanie.

**Oczekiwane:** odpowiedzi mogą różnić się sformułowaniami i zużyciem zasobów;
oba modele mogą też zwrócić tę samą poprawną odpowiedź. Zgodność jest
wartościową obserwacją. Nie powtarzaj uruchomień do chwili, aż wygra ulubiony model.

Jedna próba na prompt nie jest benchmarkiem. Opóźnienie zależy od obciążenia
usługi i buforowania. Liczba tokenów nie jest kosztem w dolarach: sprawdź
aktualny cennik każdego modelu i powtórz reprezentatywne zadania przed wyborem.
Więcej tokenów rozumowania nie dowodzi lepszej odpowiedzi. Nigdy nie żądamy
ani nie wyświetlamy ukrytego toku rozumowania (chain-of-thought).

## Prompty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki

Poniższe polskie wersje służą ćwiczeniom. Nie zastępują zapisanych angielskich
żądań ani nie dowodzą, że polskie żądanie wykonano. W parach zachowaj identyczny
prompt dla obu modeli. Dane źródłowe i wymagane literały pozostają niezmienione;
automatyczne kontrole oryginalnego eksperymentu nie są walidatorem dowolnego
polskiego ćwiczenia.

### Wyjaśnienie pojęcia

- **Ogólny:** „Wyjaśnij, jak model językowy tworzy tekst. Odpowiedź musi mieć
  mniej niż 100 słów”.
- **Precyzyjny:** „Wyjaśnij dziesięciolatkowi, jak model językowy tworzy tekst.
  Użyj dokładnie dwóch wierszy z punktami, każdy zaczynając od «- », i najwyżej
  45 słów łącznie. Wspomnij tokeny i kontekst. Nie twierdź, że model wyszukuje
  całą zapisaną wcześniej odpowiedź”.

Polskie „tokeny” i „kontekst” oddają sens promptu, ale nie spełniają dosłownej
angielskiej kontroli słów kluczowych. Oceniaj je ręcznie, nie przedstawiaj jako
zaliczonej kontroli oryginalnego wykonania.

### Od notatki do danych

- **Ogólny:** „Przeczytaj tę notatkę klasową i powiedz, co przynieść:
  «Please bring 3 notebooks to class.»”.
- **Precyzyjny:** „Wyodrębnij przedmiot i ilość z tej notatki klasowej:
  «Please bring 3 notebooks to class.» Zwróć tylko obiekt JSON z dokładnie dwoma
  polami: item (angielska nazwa przedmiotu w liczbie mnogiej, małymi literami)
  i quantity (liczba całkowita). Nie używaj bloków kodu Markdown, komentarzy
  ani dodatkowych pól”.

Notatka oznacza „Proszę przynieść na zajęcia 3 zeszyty”; oryginalne dane
`notebooks` i `3` pozostawiono jako podstawę porównania.

### Ograniczenia harmonogramu

- **Ogólny:** „Zaplanuj pokazy robot, plant i art w pozycjach 1, 2, 3.
  Robot musi następować bezpośrednio po plant. Art nie może być pierwszy.
  Jaki jest harmonogram?”.
- **Precyzyjny:** „Zaplanuj pokazy robot, plant i art w pozycjach 1, 2, 3.
  Robot musi następować bezpośrednio po plant. Art nie może być pierwszy.
  Zwróć dokładnie trzy wiersze w kolejności pozycji, w formacie «1: name»,
  «2: name», «3: name». Użyj wyłącznie nazwy pokazu małymi literami
  (robot, plant lub art); bez nagłówka i wyjaśnienia”.

Nazwy danych `robot`, `plant`, `art` pozostają bez zmian; oznaczają pokazy
robota, rośliny i sztuki. Zapis `1: plant` itd. powyżej jest wzorcem oczekiwanym,
a nie dopisanym polskim wynikiem API.

**Wypróbuj:** zmień jedno zadanie w `lib/model-comparison.mjs`, zachowaj identyczny
prompt wewnątrz każdej pary modeli, wdróż ponownie i obejrzyj oba wyniki.
Użyj tych samych kryteriów ręcznych i obsługiwanych konfiguracji.

**Dowody:** `results/12-models.json` zawiera wszystkie dwanaście rzeczywistych
odpowiedzi, żądania, wersje modeli, metryki i kontrole celów. Metadane wykonania
Azure identyfikują zadanie w chmurze. Galeria pokazuje sześć par; robocza
prezentacja zawiera fragmenty obok siebie i odsyłacz do pełnych zapisów.
