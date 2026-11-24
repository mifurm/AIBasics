# 02 — Role i priorytet instrukcji

[English](02-roles.en.md) | [Polski](02-roles.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**5 minut.** Oddziel instrukcje aplikacji od pytania użytkownika.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/02-roles/demo.mjs`.
3. Przeczytaj dwa komunikaty systemowe i identyczne pytanie o grawitację.
4. Porównaj przyjaznego nauczyciela z redaktorem naukowym. W [promptach](../../lib/labs.mjs)
   zmień rolę na przewodnika muzealnego.

**Oczekiwane:** to samo pytanie prowadzi do innego stylu i poziomu szczegółowości.
Ręcznie sprawdź limit 60 słów. Role nie dodają wiedzy o faktach ani nie tworzą granicy
bezpieczeństwa. To typy komunikatów wysyłanych do API, a nie przebrania osobnych agentów.

**Prompty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki:**

- `system`, nauczyciel: „Jesteś przyjaznym nauczycielem w szkole podstawowej.
  Wyjaśniaj, używając analogii do placu zabaw, w najwyżej 60 słowach”.
- `system`, redaktor: „Jesteś redaktorem naukowym. Podaj precyzyjną definicję,
  a następnie jedno zastrzeżenie, w najwyżej 60 słowach”.
- W obu przypadkach `user`: „Czym jest grawitacja?”.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria.
**Dowody:** `results/02-roles.json`; laboratorium 02 w galerii; odpowiadające mu nagranie w prezentacji.
