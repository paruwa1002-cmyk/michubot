# Mnichu Trading World 👻

Bot Discord.js w stylu poprzedniego bota.

## Start

1. Skopiuj `.env.example` jako `.env`.
2. Wpisz w `.env`:
   - `TOKEN`
   - `CLIENT_ID`
   - `GUILD_ID`
3. Uruchom:

```bash
npm start
```

Mozesz tez kliknac `start-bot.cmd`.

## Komendy

- `/giveaway nagroda czas wygrani` - tworzy giveaway. Czas podawaj jako `30s`, `10m`, `2h` albo `1d`.
- `/cennik` - wysyla panel cennika z lista kategorii.
- `/tickets` - wysyla panel ticketow.
- `/sticky tekst` - ustawia sticky message na aktualnym kanale.
- `/sticky-off` - wylacza sticky message na aktualnym kanale.

## Ustawienia w kodzie

Kanaly, role, kategorie ticketow, reaction role, antylink i cennik edytujesz na gorze `index.js`, w sekcji `SETTINGS`.

`config.json` trzyma tylko zapisane sticky message, zeby bot pamietal je po restarcie.
