# 00a — Czym jest token?

[English](00a-tokens.en.md) | [Polski](00a-tokens.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**7 minut. Przeprowadź bezpośrednio po laboratorium 00, przed laboratorium 01.**

W laboratorium 00 używaliśmy małego słownika opartego na słowach. Rzeczywiste
modele językowe zwykle korzystają z wyuczonych fragmentów tekstu. Tokenizer
zamienia tekst na całkowitoliczbowe identyfikatory; model odczytuje te ID.
Token może być słowem, częścią słowa, znakiem interpunkcyjnym, a nawet tylko
częścią bajtów UTF-8 jednego znaku. Niekoniecznie jest słowem.

## Przewidź

To tłumaczenia tego samego zdania:

| Język | Zdanie |
| --- | --- |
| Polski | Kot śpi na ciepłym parapecie. |
| Angielski | The cat sleeps on the warm windowsill. |
| Hiszpański | El gato duerme en el alféizar cálido. |

Przewidź, które wymaga najmniej tokenów. Czy mniejsza liczba znaków gwarantuje
mniej tokenów?

## Uruchom i sprawdź

```sh
npm ci
npm run demo -- 00a-tokens
# Equivalent:
node labs/00a-tokens/demo.mjs
```

Ostatnie polecenie jest równoważnym sposobem uruchomienia.
Nie potrzeba konfiguracji Azure, Pythona, klucza API ani żądania do modelu.
Po instalacji tokenizer działa offline. Skrypt zapisuje rzeczywiście obliczone
wyniki w [pliku wynikowym](../../results/00a-tokens.json).

Używamy [tokenizera i kodowania tiktoken od OpenAI](https://github.com/openai/tiktoken)
za pośrednictwem [powiązań JavaScript/WASM utrzymywanych przez społeczność](https://github.com/dqbd/tiktoken).
Pakiet npm jest warstwą powiązań, a nie oficjalnym SDK OpenAI dla JavaScriptu.
Stałe kodowanie to **o200k_base**, używane przez GPT-4o.

Dla dokładnie tych zdań zmierzone liczby tokenów wynoszą:
**polski: 11, angielski: 9, hiszpański: 12**. Galeria pokazuje wykres porównawczy,
liczbę znaków i bajtów oraz tabelę z ID każdego tokenu, ujętym w cudzysłów
fragmentem tekstu i dokładnymi bajtami. Ponowne uruchomienie oblicza te wartości;
nie są to wyniki wpisane na sztywno.

Poproś uczniów o znalezienie:

- Spacji dołączonej do następnego słowa (`" cat"` jest tu jednym tokenem).
- Słowa podzielonego na tokeny (`" windows"` i `"ill"`).
- Tokenu interpunkcyjnego (`"."`).
- Zdania krótszego w znakach, które mimo to wymaga więcej tokenów.

Identyfikatory to pozycje w słowniku, a nie oceny, znaczenia ani liczby słów.
Znaki diakrytyczne są zachowane. Pojedyncze tokeny mogą dzielić znak Unicode;
dekodowanie samego fragmentu może wyświetlić znak zastępczy. Kolumna dokładnych
bajtów pozwala uniknąć przedstawiania takiego fragmentu jako oryginalnego tekstu.
Kontrola łączy bajty wszystkich tokenów i dekoduje całą sekwencję, aby odtworzyć
każde oryginalne zdanie bez żadnych zmian.

## Wyjaśnij i przedyskutuj

Tokenizery korzystają z wyuczonego słownika częstych wzorców bajtów. Różna
pisownia, języki, spacje i słowniki prowadzą do innych granic podziału.
Równoważne znaczenie nie wymaga tej samej liczby tokenów.

To jedno zdanie **nie jest rankingiem języków**. Inne zdanie lub kodowanie
może dać inne proporcje. Tokenizacja nie tłumaczy, nie rozumuje ani nie trenuje modelu.

Te liczby obejmują **wyłącznie tekst zdań**, bez opakowania formatu czatu,
komunikatów systemowych, narzędzi czy wygenerowanej odpowiedzi. Nie stanowią
pełnego zużycia API ani wyceny w dolarach. Tokeny mają znaczenie dla limitów
kontekstu i kosztów rozliczanych za tokeny; [laboratorium 06](../06-token-budget/readme.pl.md)
dotyczy ucinania wyjścia, a [laboratorium 29](../29-tokenization/readme.md) —
uczenia BPE i szerszych porównań.

## Zmień jedną rzecz

Zastąp trzy wpisy w [tokenSentences](../../lib/tokenizer-lab.mjs) tłumaczeniami
innego zdania. Uruchom ponownie i sprawdź nowe granice tokenów. Jeśli liczby
okażą się równe, jawna kontrola dydaktyczna „trzy różne liczby” zakończy się
niepowodzeniem: to uczciwa obserwacja, a nie awaria tokenizera.

Zdania w tabeli i fragmenty tokenów powyżej są oryginalnymi danymi pomiarowymi,
nie nowymi polskimi wynikami API. Propozycja zmiany zdania jest ćwiczeniem,
a nie dowodem wykonanego eksperymentu.

## Opcjonalne wykonanie w Azure i publikacja

Istniejące zadanie może wykonać to samo obliczenie na CPU. Podczas startu
instaluje tylko zależność produkcyjną w wersji ustalonej plikiem blokady,
gdy wybrano to laboratorium; wymaga dostępu do rejestru npm.
Wybranie innych laboratoriów nie powoduje instalacji pakietów.

```sh
npm run deploy:agents -- --confirm-costs
npm run azure:agents -- 00a-tokens
npm run gallery
npm run deck -- --allow-missing-recordings
npm run publish -- --include-deck
npm run verify
```

Wykonanie na CPU w Azure i monitorowanie podlegają zwykłym opłatom,
ale to laboratorium nie wysyła żadnych żądań API do modelu.
Istniejące identyfikatory laboratoriów pozostają bez zmian.
