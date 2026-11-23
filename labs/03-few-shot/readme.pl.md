# 03 — Pokaż wzorzec na przykładach

[English](readme.md) | [Polski](readme.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**5 minut.** Pokaż uczenie na kilku przykładach (few-shot) w obrębie jednego żądania.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/03-few-shot/demo.mjs`.
3. Najpierw poproś o wymyślone etykiety bez definicji, a potem podaj cztery przykłady.
4. Poproś uczniów o wywnioskowanie, że SUN = wydźwięk pozytywny, a RAIN = negatywny.
5. Dodaj MIXED i niejednoznaczny przykład w [promptach](../../lib/labs.mjs).

**Oczekiwane:** odpowiedź po podaniu przykładów to dokładnie `SUN` dla zdania
o wspaniałym zestawie do budowy robota. Skrypt to sprawdza. Odpowiedź bez przykładów
może przypadkiem też być poprawna. Few-shot prompting nie aktualizuje wag modelu
i nie przenosi się na kolejne żądania, chyba że przykłady zostaną wysłane ponownie.

**Prompty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki:**

- Bez definicji: „Sklasyfikuj «Zestaw do budowy robota był wspaniały!», używając wyłącznie SUN lub RAIN”.
- Z przykładami:

```text
Zwróć tylko jedną etykietę. Przykłady:
"Bardzo podobała mi się lekcja!" -> SUN
"Zestaw był zepsuty." -> RAIN
"To było niesamowite!" -> SUN
"Jestem rozczarowany." -> RAIN
Teraz sklasyfikuj: "Zestaw do budowy robota był wspaniały!"
```

Oryginalne angielskie przykłady i etykiety w zapisie wykonania pozostają bez zmian.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria.
**Dowody:** `results/03-few-shot.json`; laboratorium 03 w galerii; odpowiadające mu nagranie w prezentacji.
