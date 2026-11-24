# 07 — Kontekst to nie trwała pamięć

[English](07-context.en.md) | [Polski](07-context.pl.md)

**Język galerii:** przełącznik zmienia tekst dydaktyczny i udostępnia polskie tłumaczenia promptów do ćwiczeń. Oryginalne zapisane prompty, odpowiedzi modeli i metryki pozostają bez zmian. Tłumaczenia służą nauczaniu — nie są zmyślonymi wynikami polskich wywołań API.

**5 minut.** Sprawdź, co aplikacja faktycznie wysyła w każdym żądaniu.

1. Wykonaj [wspólną konfigurację](../../README.md#setup-and-deploy).
2. Uruchom `node labs/07-context/demo.mjs`.
3. Jedno żądanie zawiera wcześniejszą wymianę o imieniu robota, a drugie nie.
4. Zapytaj, dlaczego tylko pierwsze zna Pebble. Zmień imię
   w [historii żądania](../../lib/labs.mjs).

**Oczekiwane:** dołączona historia -> Pebble; nowe żądanie -> przyznanie, że model
nie wie. Oba zachowania są sprawdzane. Skrypt jawnie wysyła wcześniejszą wypowiedź
asystenta; Azure nie pamięta tej wymiany automatycznie.

To laboratorium nie bada maksymalnego okna kontekstu ani zapisanej pamięci
na poziomie produktu. Rzeczywiste aplikacje muszą wybierać, jaka historia zmieści
się w ograniczonym oknie modelu.

**Komunikaty do ćwiczeń — tłumaczenia dydaktyczne, nie wykonane wyniki:**

- `system`: „Odpowiadaj jednym krótkim zdaniem. Jeśli brakuje informacji, powiedz, że nie wiesz”.
- Historia: `user`: „Nasz klasowy robot ma na imię Pebble”;
  `assistant`: „Wasz klasowy robot ma na imię Pebble”.
- Pytanie w obu wariantach, `user`: „Jak ma na imię nasz klasowy robot?”.

Przetłumaczona wypowiedź `assistant` jest elementem przykładowej historii,
nie nową odpowiedzią uzyskaną z API.

**Infrastruktura:** wspólny Azure GPT-4o i statyczna galeria.
**Dowody:** `results/07-context.json`; laboratorium 07 w galerii; odpowiadające mu nagranie w prezentacji.
