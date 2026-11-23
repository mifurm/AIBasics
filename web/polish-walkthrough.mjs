const normalizationWhere = [
  'średnia z 8 liczb',
  'rozrzut 8 liczb, czyli wariancja',
  'mała liczba 0.00001, która zapobiega dzieleniu przez zero',
  'wyuczone rozciągnięcie i przesunięcie k-tej liczby; ta normalizacja ma własną parę parametrów',
];

export const steps = {
  tokens: {
    title: 'Zamień słowa na identyfikatory', technical: 'Tokenizacja',
    plain: 'Komputer operuje na liczbach. Ten model zna tylko 9 pozycji słownika. Identyfikator to miejsce słowa w słowniku, liczone od 0, nie jego wielkość ani ważność. Tabele pokazują dokładne przypisania i zapis wejścia. Znacznik <bos> oznacza początek zdania. To dydaktyczne tokeny słowne, nie tokenizacja GPT.',
    where: ['i-te słowo zdania', 'miejsce słowa w słowniku, liczone od 0', 'identyfikator reprezentujący słowo i'],
  },
  embed: {
    title: 'Odczytaj wektor każdego słowa', technical: 'Embedding tokenu',
    plain: 'Identyfikator wybiera jeden wiersz tablicy E. Wiersz zawiera 8 liczb: wektor słowa. Nikt nie wpisał tych wartości ręcznie. Zaczynały jako liczby losowe, a trening zmieniał je tak, aby pomagały przewidywać następne słowo.',
    where: ['wyuczona tablica: po jednym wierszu 8 liczb dla każdej z 9 pozycji słownika', 'wiersz wybrany dla słowa i, czyli wektor 8 liczb'],
  },
  position: {
    title: 'Dodaj pozycję słowa w zdaniu', technical: 'Embedding pozycyjny',
    plain: 'Kolejność słów ma znaczenie: „robot is blue” i „blue is robot” nie znaczą tego samego. Każda pozycja ma własne 8 liczb w wyuczonej tablicy P. Dodajemy wektor pozycji do wektora słowa, współrzędna po współrzędnej. Wynik x opisuje słowo na jego pozycji.',
    where: ['wiersz tablicy P dla pozycji i', 'początkowy wektor słowa i na jego pozycji', 'numer współrzędnej, od 1 do 8'],
  },
  norm1: {
    title: 'Wyrównaj skalę liczb, jak głośność', technical: 'Normalizacja warstwowa',
    plain: 'Liczby w x mogą mieć różną skalę, co utrudnia uczenie. Odejmujemy ich średnią, dzielimy przez typowy rozrzut, a potem stosujemy wyuczone rozciągnięcie g i przesunięcie β. To jak ustawienie słów na podobną głośność. Małe ε zapobiega dzieleniu przez zero. Przed zastosowaniem g i β średnia jest bliska 0, a wariancja bliska 1.',
    where: normalizationWhere,
  },
  qkv: {
    title: 'Utwórz Query, Key i Value dla każdego słowa', technical: 'Projekcje liniowe',
    plain: 'Z wektora n powstają trzy nowe wektory po 8 liczb, każdy z własną wyuczoną tablicą. Wyobraź sobie bibliotekę: Query to pytanie „czego szukam?”, Key to etykieta książki „co zawieram?”, a Value to treść przekazywana po wyborze książki. Każda nowa liczba jest sumą ważoną liczb n oraz przesunięcia.',
    where: ['trzy wyuczone tablice, każda ma 8 wierszy po 8 liczb', 'wyuczone przesunięcia, po 8 liczb', 'liczba w wierszu j i kolumnie k tablicy W_Q', 'j-ta współrzędna Query słowa i'],
  },
  scores: {
    title: 'Porównaj pytanie z każdą etykietą', technical: 'Wyniki dopasowania uwagi',
    plain: 'Ostatnie słowo sprawdza, które dotychczasowe słowa są dla niego istotne. Porównuje swoje Query z Key każdego dostępnego słowa, także własnym. Iloczyn skalarny mnoży odpowiadające sobie liczby i sumuje wyniki. Duży dodatni wynik oznacza dobre dopasowanie. Dzielenie przez √8 ogranicza skalę wyników.',
    where: ['słowo, które pyta; w tym przykładzie „is”', 'słowo, na które kierowana jest uwaga', 'dopasowanie pytania słowa i do etykiety słowa j', 'pierwiastek z długości wektora, około 2.828'],
  },
  mask: {
    title: 'Ukryj przyszłość', technical: 'Maska przyczynowa',
    plain: 'Podczas przewidywania następnego słowa model nie może widzieć późniejszych słów, bo mógłby skopiować odpowiedź. Wyniki dla przyszłych pozycji zastępujemy −∞. Softmax zamienia je w dokładnie 0% uwagi. Czytaj tabelę wierszami: dane słowo widzi tylko siebie i wcześniejsze słowa. Ostatnie słowo widzi cały dotychczasowy kontekst, a pierwsze tylko siebie.',
    where: ['słowo j występuje później niż słowo i', 'minus nieskończoność; exp(−∞) = 0'],
  },
  softmax1: {
    title: 'Zamień wyniki na procentowe udziały uwagi', technical: 'Softmax',
    plain: 'Wyniki dopasowania mogą być ujemne. Softmax przekształca je w nieujemne udziały sumujące się do 100%. Najpierw oblicza exp(s), czyli e (około 2.718) do potęgi s, a potem dzieli przez sumę tych wartości. Większy wynik daje większy udział. Dla ukrytej pozycji exp(−∞) = 0, więc udział wynosi dokładnie zero. Udziały nazywamy wagami uwagi.',
    where: ['udział uwagi słowa i skierowany do słowa j', 'liczba e (około 2.718) podniesiona do potęgi s'],
  },
  blend: {
    title: 'Połącz Value zgodnie z udziałami uwagi', technical: 'Suma ważona Value',
    plain: 'Każde słowo przenosi wektor Value. Ostatnie słowo tworzy nowy wektor 8 liczb, sumując wektory Value pomnożone przez udziały uwagi. Słowo o większym udziale wnosi więcej. Wynik m zawiera więc informacje z tych wcześniejszych słów, na które skierowano uwagę.',
    where: ['połączony wektor 8 liczb dla słowa i', 'Value słowa j z kroku 5; każdą z 8 współrzędnych mnożymy przez α_ij'],
  },
  shortcut1: {
    title: 'Przekształć wynik i dodaj połączenie rezydualne', technical: 'Projekcja wyjściowa i połączenie rezydualne',
    plain: 'Połączony wektor m przechodzi przez wyuczoną tablicę W_O z przesunięciem b_O, dając o. Następnie dodajemy do o początkowy wektor x z kroku 3. To połączenie rezydualne: zachowuje wcześniejszy sygnał i dodaje informację zebraną przez uwagę.',
    where: ['wyuczona tablica 8 × 8 i 8 wyuczonych przesunięć', 'przekształcony wynik łączenia Value', 'wektor po uwadze: wcześniejszy sygnał plus wynik uwagi'],
  },
  norm2: {
    title: 'Ponownie wyrównaj skalę', technical: 'Druga normalizacja warstwowa',
    plain: 'Stosujemy tę samą procedurę co w kroku 4, ale do wektora r i z własnymi wyuczonymi g oraz β. Przygotowuje to liczby do kolejnego etapu.',
    where: normalizationWhere,
  },
  expand: {
    title: '16 detektorów: wyłącz ujemne wyniki', technical: 'Pierwsza warstwa feed-forward i ReLU',
    plain: 'Teraz każda pozycja jest przetwarzana oddzielnie, bez odczytywania innych słów. Z 8 liczb powstaje 16 „detektorów”. Każdy jest sumą ważoną wejścia i przesunięcia. ReLU pozostawia wartości dodatnie, a ujemne zastępuje zerem. Ta nieliniowość pozwala robić więcej niż same przekształcenia liniowe.',
    where: ['wyuczona tablica 16 × 8 i 16 wyuczonych przesunięć', 'wartość detektora j przed ReLU', 'wartość detektora j po ReLU', 'większa z liczb: 0 i z'],
  },
  shortcut2: {
    title: 'Wróć do 8 liczb i dodaj drugie połączenie rezydualne', technical: 'Druga warstwa feed-forward i połączenie rezydualne',
    plain: 'Tablica W_2 przekształca 16 wartości detektorów z powrotem w 8 liczb. Wynik f opisuje nową informację z tego etapu. Dodajemy go do r, uzyskując y. Model zachowuje wcześniejszy sygnał i dodaje to, co wyznaczyła sieć feed-forward.',
    where: ['wyuczona tablica 8 × 16 i 8 wyuczonych przesunięć', 'wynik etapu feed-forward', 'wektor słowa po całym bloku'],
  },
  norm3: {
    title: 'Ostatni raz wyrównaj skalę', technical: 'Końcowa normalizacja warstwowa',
    plain: 'Jeszcze raz normalizujemy, teraz wektor y, używając własnych g i β. Dzięki temu etap wyznaczania ocen dostaje liczby o podobnej skali. Wynik t jest końcową reprezentacją słowa „is” w jego kontekście.',
    where: normalizationWhere,
  },
  readout: {
    title: 'Wyznacz ocenę każdego słowa w słowniku', technical: 'Odczyt liniowy: logity',
    plain: 'Model ma przewidzieć kolejne słowo. Każda z 9 pozycji słownika ma w W_R własny wiersz 8 wyuczonych liczb. Iloczyn z t, powiększony o przesunięcie, daje ocenę tego słowa. Wyższa ocena oznacza większą szansę wyboru. Te surowe oceny nazywamy logitami.',
    where: ['pozycja słownika', 'wyuczona tablica 9 × 8 i 9 wyuczonych przesunięć', 'surowa ocena (logit) słowa w'],
  },
  probabilities: {
    title: 'Zamień oceny na prawdopodobieństwa', technical: 'Softmax',
    plain: 'Ponownie stosujemy softmax, jak w kroku 8, ale tym razem do ocen wszystkich 9 pozycji słownika. Otrzymane prawdopodobieństwa sumują się do 100%. To rozkład przewidywania następnego tokenu, a nie pewność dotycząca prawdziwości faktów.',
    where: ['prawdopodobieństwo, że następnym słowem będzie w', 'oceny dziewięciu pozycji słownika'],
  },
  choose: {
    title: 'Wybierz następne słowo i powtórz', technical: 'Dekodowanie zachłanne',
    plain: 'Stosujemy najprostszą regułę: wybieramy token o największym prawdopodobieństwie, dopisujemy go do wejścia i uruchamiamy wszystkie kroki ponownie. Kończymy po <eos>, czyli znaczniku końca zdania. Modele czatu zwykle losują z rozkładu, co omawiają laboratoria o temperaturze. Podczas generowania wagi się nie zmieniają; zmienia je trening.',
    where: ['słowo w o największym prawdopodobieństwie P(w)'],
  },
  loss: {
    title: 'Zmierz, jak bardzo model się myli', technical: 'Strata entropii krzyżowej',
    plain: 'Trening potrzebuje liczby opisującej błąd. Niewytrenowany model czyta zdanie, a na każdej pozycji przypisuje prawdopodobieństwa następnym słowom. Odczytujemy P dla słowa, które faktycznie występuje dalej. Kara wynosi −ln(P): dla 100% jest zerowa, a dla 10% wynosi około 2.30. Średnia kar to strata L. Niewytrenowany model prawie zgaduje spośród 9 pozycji słownika.',
    where: ['prawdopodobieństwo przypisane prawdziwemu następnemu słowu w kroku t', 'liczba przewidywań pokazana w tabeli', 'logarytm naturalny: ln(1) = 0; malejące P daje coraz bardziej ujemny ln(P)'],
  },
  slope: {
    title: 'Ustal kierunek zmiany parametru', technical: 'Pochodna straty i propagacja wsteczna',
    plain: 'Aby poprawić model, ustalamy, w którą stronę zmienić każdą wagę. Wybieramy w: przesunięcie oceny tokenu „blue”. Minimalnie zwiększamy i zmniejszamy w o δ, porównujemy straty i obliczamy przybliżoną pochodną. Propagacja wsteczna stosuje regułę łańcuchową, wyznaczając pochodne wszystkich 833 parametrów naraz. Tabela porównuje obie metody.',
    where: ['badany parametr: przesunięcie oceny tokenu „blue”', 'mała zmiana o 0.00001', 'strata po zwiększeniu w o δ', 'pochodna straty względem w obliczona propagacją wsteczną'],
  },
  update: {
    title: 'Zmień nieco każdy parametr', technical: 'Krok optymalizacji Adam',
    plain: 'Parametr przesuwamy w kierunku zmniejszającym stratę. Najprostsza reguła to nowe w = w − η × pochodna; η to tempo uczenia. Używamy Adama, który uwzględnia też skalę ostatnich pochodnych. W pierwszej aktualizacji daje on zmianę o niemal η we właściwym kierunku. Wzór poniżej dotyczy właśnie tego pierwszego kroku, a nie wszystkich późniejszych aktualizacji. Trening aktualizuje jednocześnie wszystkie 833 parametry.',
    where: ['uczony parametr', 'pochodna z kroku 2, ograniczona do przedziału od −1 do 1', 'tempo uczenia odczytane z rzeczywistego przebiegu', 'wartość bezwzględna g, bez znaku'],
  },
  repeat: {
    title: 'Powtórz 400 razy', technical: 'Pętla treningowa',
    plain: 'Uczenie powtarza cykl: przeczytaj zdanie, zmierz stratę, oblicz pochodne i zmień parametry. Tutaj wykonujemy 400 aktualizacji, naprzemiennie dla dwóch zdań treningowych. Tabela pokazuje spadek straty. Końcowe wagi są używane w opisie predykcji; podczas samego generowania pozostają stałe.',
    where: ['liczba aktualizacji; używamy optymalizatora Adam i tempa uczenia zapisanego w danych przebiegu'],
  },
};

const forwardGlossary = [
  ['Wektor', 'Lista liczb. W tym modelu każde słowo opisuje 8 liczb.'],
  ['Wyuczona tablica (wagi)', 'Liczby początkowo losowe, zmieniane podczas treningu tak, aby poprawiać przewidywania. Model ma 833 takie parametry.'],
  ['Iloczyn skalarny', 'Pomnóż odpowiadające sobie liczby dwóch list i zsumuj wyniki. Wynik jest duży, gdy wektory są zgodnie skierowane.'],
  ['Softmax', 'Przekształcenie ocen na nieujemne udziały sumujące się do 100%.'],
  ['Połączenie rezydualne', 'Dodanie wejścia etapu do jego wyjścia, dzięki czemu etap musi wyznaczyć tylko nową informację.'],
  ['ReLU', 'Pozostawia wartości dodatnie i zamienia ujemne na zero.'],
  ['Logit', 'Surowa ocena tokenu przed przekształceniem w prawdopodobieństwo.'],
];

export function localizeWalkthrough(walkthrough, localizeBlock) {
  const forward = walkthrough.kind === 'forward';
  return {
    ...walkthrough,
    title: forward ? 'Prześledź jedną predykcję krok po kroku' : 'Zobacz, jak model uczy się swoich parametrów',
    intro: forward ? [
      `Śledzimy zdanie „${walkthrough.sentence}” w wytrenowanym modelu. Zadanie polega na przewidzeniu następnego słowa. Każdy z ${walkthrough.steps.length} kroków ma proste wyjaśnienie, równanie i rzeczywiste liczby z zapisanego przebiegu, nie wymyślone przykłady.`,
      'Obserwujemy ostatnie słowo, ponieważ jego wyjście przewiduje następny token. Indeks i oznacza słowo pytające, a j słowo obserwowane. W opisie współrzędne liczymy od 1; identyfikatory słownika zaczynają się od 0. Wyświetlane liczby są zaokrąglone, zwykle do 3 miejsc. Równania sprawdzono na wartościach z pełną precyzją. Angielskie słowa są stałymi tokenami modelu i nie są tłumaczone.',
    ] : [
      'Opis predykcji korzysta z wytrenowanego modelu. Tutaj pokazujemy jedną prawdziwą aktualizację treningową: mierzymy błąd, ustalamy kierunek zmiany parametrów, zmieniamy je i powtarzamy. Liczby pochodzą z rzeczywistego przebiegu.',
    ],
    glossary: forward ? forwardGlossary : [
      ['Strata', 'Liczba mierząca błąd modelu. Trening próbuje ją zmniejszyć.'],
      ['Pochodna', 'Tempo zmiany straty, gdy jeden parametr zwiększymy o bardzo małą wartość.'],
      ['Propagacja wsteczna', 'Obliczanie pochodnych wszystkich parametrów za pomocą reguły łańcuchowej, od wyjścia do wejścia.'],
    ],
    parts: walkthrough.parts.map((part, i) => ({
      ...part,
      title: (forward ? ['Część 1: Przygotuj słowa', 'Część 2: Spójrz na wcześniejsze słowa (uwaga)', 'Część 3: Przetwarzaj każdą pozycję (feed-forward)', 'Część 4: Przewidź następne słowo'] : ['Jedna aktualizacja treningowa', 'Następnie powtarzaj'])[i],
    })),
    steps: walkthrough.steps.map(step => {
      const translated = steps[step.id];
      if (!translated || translated.where.length !== step.where.length) throw new Error(`Missing Polish walkthrough content: ${step.id}`);
      return {
        ...step, title: translated.title, technical: translated.technical, plain: translated.plain,
        where: step.where.map(([symbol], i) => [symbol, translated.where[i]]),
        notice: step.notice ? 'Porównaj szczegółowe wartości w tabelach. Równania i pomiary pozostają identyczne w obu wersjach językowych.' : undefined,
        display: step.display.map(localizeBlock),
      };
    }),
    ...(walkthrough.wrapUp ? { wrapUp: {
      ...walkthrough.wrapUp,
      title: 'Dlaczego po „robot is” model wybiera „blue”, a po „plant is” wybiera „green”',
      plain: 'Zdania różnią się jednym rzeczownikiem. Początkowy wektor x i Query słowa „is” są w obu identyczne, więc same nie pozwalają ich odróżnić. Informacja o rzeczowniku dociera przez uwagę: różne Key i Value wcześniejszego słowa zmieniają udziały uwagi i połączony wektor m. Zmieniają się też dalsze reprezentacje, logity i prawdopodobieństwa. Tabele pokazują, gdzie pojawiają się różnice i jak zmienia się wybrany token.',
      caution: 'Model zapamiętał dwa zdania. Wagi uwagi pokazują sposób łączenia informacji, ale nie są pełnym wyjaśnieniem tego, co model „myśli”.',
      display: walkthrough.wrapUp.display.map(localizeBlock),
    } } : {}),
  };
}
