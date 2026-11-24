# 09 — Oprzyj odpowiedź na źródle

[English](09-grounding.en.md) | [Polski](09-grounding.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**6 minut.** Pokaż odpowiadanie na podstawie źródła i uczciwe wskazywanie brakujących informacji.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/09-grounding/demo.mjs`.
3. Zapytaj o fikcyjne koło bez podania źródła, a potem z krótkim źródłem.
4. Sprawdź wtorek o 16:00 w `[club-1]`. Zauważ, że nie podano założyciela.
5. Zmień godziny w [źródle](../../lib/labs.mjs) i uruchom ponownie.

**Oczekiwane:** odpowiedź oparta na źródle cytuje `[club-1]`, podaje przekazaną
godzinę spotkań i mówi o założycielu „not in the source” („brak w źródle”).
Te zachowania są sprawdzane. Odpowiedź bez źródła może już przyznawać niepewność;
nie wymuszaj halucynacji.

**Rzeczywista iteracja:** w pierwszym uruchomieniu pojawiły się poprawne godziny,
ale zabrakło żądanego cytowania. Niezaliczona kontrola zatrzymała wykonanie.
Zapis zachowano w `results/09-grounding-first-attempt.json`; końcowy prompt
jednoznacznie umieszcza cytowanie po szczegółach spotkania.
Galeria i raport wyników pokazują obie próby.

To pokaz etapu generowania w RAG (retrieval-augmented generation, generowanie
wspomagane wyszukiwaniem), z ręcznie wybranym źródłem, a nie pełnym mechanizmem
wyszukiwania, modelem embeddingowym czy indeksem wyszukiwania.

**Prompty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki:**

- Bez źródła: „Kiedy spotyka się fikcyjne Pebble Robotics Club i kto je założył?
  Jeśli nie wiesz, powiedz to”.
- `system` ze źródłem: „Korzystaj wyłącznie z podanego źródła. Odpowiedź musi
  zawierać dosłowne odwołanie [club-1] bezpośrednio po szczegółach spotkania.
  W przypadku założyciela napisz «not in the source». Użyj dwóch krótkich zdań”.
- `user`: „Źródło [club-1]: Pebble Robotics Club meets Tuesdays at 16:00 in Room 7.
  Pytanie: Kiedy spotyka się koło i kto je założył?”.

Angielskie zdanie źródłowe zachowuje dane przykładu: spotkania są we wtorki
o 16:00 w Room 7. Polski tekst nie zastępuje zarejestrowanych żądań ani odpowiedzi.

**Infrastruktura:** wspólny Azure GPT-4o; bez usługi wyszukiwania i bazy danych.
**Dowody:** `results/09-grounding.json`; laboratorium 09 w galerii; odpowiadające mu nagranie w prezentacji.
