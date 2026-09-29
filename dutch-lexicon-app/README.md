# Lexicon NL — Dutch lexicon

A local, dependency-free, single-page Dutch lexicon: command palette, split-pane
master/detail, verb paradigm matrix, noun morphology deck and a sentence
dissector that links the two halves of a separable verb.

## Launch (one click)

| OS | Do this |
| --- | --- |
| macOS | double-click `start.command` |
| Windows | double-click `start.bat` |
| Linux / any | `./start.sh` or `python3 serve.py` |

Each launcher starts a tiny local server (`serve.py`, Python 3 standard library
only) on `http://127.0.0.1:8765` and opens your browser.

You can also just open `index.html` directly. Browsers block `fetch()` on
`file://`, so the app then falls back to `data/lexicon.js` (a generated mirror of
`data/lexicon.json`). Over HTTP it always reads `data/lexicon.json`.

> First run on macOS: if `start.command` is blocked, right-click → Open, or run
> `chmod +x start.command`.

## Keyboard

| Key | Action |
| --- | --- |
| `Ctrl/⌘ + K`, `/` | Command palette (fuzzy search: lemmas, inflected forms, English, categories) |
| `↑` `↓` / `J` `K` | Previous / next entry (in the palette: move; `Enter` opens) |
| `Esc` | Close palette; otherwise clear filters and stop audio |
| `P` | Play the word · `S` toggle 1.0× / 0.8× |
| `1` `2` `3` `4` | Verb tabs: Presens · Verleden tijd · Perfectum · Gebiedende wijs |

Hover (or keyboard-focus) any highlighted word in an example sentence: every
part of the verb, e.g. `meld … aan`, lights up together and an arc links them.
Audio uses the browser's Web Speech API (`nl-NL`); install a Dutch system voice
if pronunciation sounds off.

## Data

`data/lexicon.json` is an array of entries in exactly the schema from the brief.
Fields the brief left open: `noun_inflection` is
`{ singular, plural, diminutive_singular, diminutive_plural }` (each with its
article). The `present_ott.jij_je` / `u` fields hold the normal form and the
inverted form separated by ` / `, e.g. `meldt aan / meld je aan`.

### Provenance — please read

The four sources named in the brief (ANW, woorden.org, mijnwoordenboek.nl,
Onze Taal) **could not be scraped**: the build environment's network policy
blocked all four hosts. The 10 seed entries were therefore written from standard
Dutch grammar knowledge and **have not been cross-checked against those sources**.
Each entry's detail view carries "Cross-check" links (ANW, woorden.org,
mijnwoordenboek) so you can verify a word in one click. The links follow each
site's usual URL pattern but were not opened during the build. Levels (A1/A2)
are estimates, and example sentences are original, not ANW corpus quotations.

### Validating and extending

```bash
python3 tools/validate.py              # schema + grammar checks
python3 tools/validate.py --write-js   # ...and regenerate data/lexicon.js
```

The validator checks, among other things: exact schema key order; exactly 3
examples with the required contexts; example 3 in a past/perfect tense; every
`highlight_terms` item found as a whole word, in order, in its sentence; noun
articles and diminutives (`het` + `-je`, plural `de` + `-s`); the perfect-tense
auxiliary matches `hebben`/`zijn`; and that a separable verb's prefix is split
off in every finite form and the imperative.

To add a word, append an entry to `data/lexicon.json`, run the validator with
`--write-js`, and reload. Filters, counters and search pick it up automatically.

## Files

```
index.html   markup shell
styles.css   design system (obsidian #0A0C0E · de #38BDF8 · het #F59E0B · verb #10B981)
app.js       state, filtering, palette, paradigms, dissector, speech
data/lexicon.json   source of truth · data/lexicon.js  generated file:// fallback
tools/validate.py   validator + fallback generator
serve.py, start.sh, start.command, start.bat   launchers
```

Fonts (Plus Jakarta Sans, JetBrains Mono) load from Google Fonts when online and
fall back to system fonts offline.
