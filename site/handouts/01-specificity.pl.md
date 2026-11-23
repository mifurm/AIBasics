# 01 — Od ogólnika do użytecznej odpowiedzi

[English](readme.md) | [Polski](readme.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**5 minut.** Naucz się określać zadanie, odbiorcę, ograniczenia i format odpowiedzi.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. W katalogu głównym projektu uruchom `node labs/01-specificity/demo.mjs`.
3. Porównaj ogólne wyjaśnienie fotosyntezy z wyjaśnieniem w trzech punktach
   dla dziesięciolatka. Zapytaj uczniów, którego można użyć od razu.
4. Zmień temat w [promptach](../../lib/labs.mjs) i uruchom ponownie.

**Oczekiwane:** precyzyjny prompt zwykle daje odpowiedź bardziej przydatną na lekcji.
Samodzielnie sprawdź liczbę punktów, uwzględnione składniki i analogię;
wykonanie instrukcji nie jest gwarantowane. Dłuższy prompt nie zawsze jest lepszy.

**Prompty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki:**

- Ogólny: „Wyjaśnij fotosyntezę”.
- Precyzyjny: „Wyjaśnij fotosyntezę dziesięciolatkowi w dokładnie trzech krótkich punktach.
  Użyj analogii do kuchni. Uwzględnij światło słoneczne, wodę i dwutlenek węgla”.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria; bez osobnych zasobów dla laboratorium.
**Dowody:** `results/01-specificity.json`; laboratorium 01 w galerii; odpowiadające mu nagranie w prezentacji.
