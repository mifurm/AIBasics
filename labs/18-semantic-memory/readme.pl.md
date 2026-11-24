# 18 — Znajdź wspomnienie według znaczenia, nie słów kluczowych

[English](readme.md) | [Polski](readme.pl.md)

**Uwaga o dowodach:** tłumaczenia służą nauczaniu. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian; nie są zmyślonymi wynikami polskich wywołań API. Cytat, nazwy kart i literały odpowiedzi poniżej pozostają oryginalne.

**8 minut; dwa żądania czatu i jedno zbiorcze żądanie embeddingów.**

1. Wykonaj [konfigurację](../../README.md#setup-and-deploy). To laboratorium wymaga
   dodatkowo istniejącego wdrożenia `text-embedding-3-small` lub opcjonalnej
   infrastruktury modeli zestawu, która tworzy je dla nowego konta.
2. Uruchom `node labs/18-semantic-memory/demo.mjs`.
3. Bez przekazanej pamięci pytanie o dzień tygodnia powinno zwrócić `UNKNOWN`.
4. W jednym żądaniu Azure utwórz embeddingi trzech fikcyjnych kart oraz pytania:
   „W który dzień tygodnia powinniśmy nawadniać roślinę w klasie?”.
   Oryginalny tekst: "On which weekday should we hydrate the classroom plant?"
5. Lokalnie obliczone podobieństwo cosinusowe szereguje karty. Wybrana karta
   podlewania mówi, że paproć potrzebuje wody w każdy Monday (poniedziałek),
   mimo innego sformułowania pytania.
6. Przekaż GPT-4o tylko tę kartę. Oczekiwana odpowiedź: Monday z `[watering]`.

**Dwa rodzaje modeli:** model embeddingów tworzy wektory liczbowe, nie odpowiedź
czatu; model czatu przekształca pobrane źródło w odpowiedź. Ranking to zwykły
kod aplikacji. Skrypt zapisuje wyniki podobieństwa, wymiary wektorów, wybraną
kartę, zużycie zasobów embeddingów i rzeczywistą odpowiedź czatu.

**Wypróbuj:** dodaj inną kartę lub zapytaj o zwrot książek. Sprawdź, czy
wyszukiwanie wybiera właściwą kartę i czy odpowiedź naprawdę z niej wynika.
Podobieństwo nie oznacza pewności, prawdy ani uniwersalnego progu. Ten mały
indeks jest odbudowywany przy każdym uruchomieniu; nie jest trwałym magazynem
wektorowym ani pełnym produkcyjnym RAG.

**Infrastruktura:** wspólny GPT-4o i istniejący text-embedding-3-small; bez usługi
wyszukiwania lub bazy danych. `embeddingDeployment` może nadpisać nazwę wdrożenia
w lokalnej konfiguracji.
**Dowody:** `results/18-semantic-memory.json`; kontrole sprawdzają wybraną kartę,
dzień tygodnia i cytowanie, a nie tylko dodatnią wartość podobieństwa.
