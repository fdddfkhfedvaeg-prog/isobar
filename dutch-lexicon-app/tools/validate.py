#!/usr/bin/env python3
"""Validate data/lexicon.json against the schema and the grammar rules of the
project brief, and (with --write-js) regenerate data/lexicon.js, the fallback
that lets index.html work when opened straight from disk (file://).

    python3 tools/validate.py              # validate only
    python3 tools/validate.py --write-js   # validate, then write data/lexicon.js
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_PATH = ROOT / "data" / "lexicon.json"
JS_PATH = ROOT / "data" / "lexicon.js"

TOP_KEYS = [
    "id", "word", "article", "type", "level", "category", "fixed_preposition",
    "separable_prefix", "definition_nl", "definition_en", "noun_inflection",
    "verb_conjugation", "examples", "audio_query",
]
TYPES = {"noun", "verb", "separable_verb"}
LEVELS = {"A1", "A2", "B1", "B2", "C1", "C2"}
OTT_KEYS = ["ik", "jij_je", "u", "hij_zij_het", "wij_we", "jullie", "zij_ze"]
NOUN_KEYS = ["singular", "plural", "diminutive_singular", "diminutive_plural"]
CONTEXT_PREFIXES = ["Dagelijks leven", "Formeel / Gemeente", "Verleden tijd / Correspondentie"]
PAST_MARKERS = re.compile(
    r"\b(vorige|gisteren|hebben|heeft|heb|is|zijn|ben|was|waren|kreeg|kregen|"
    r"meldde|meldden|vulde|vulden|ging|gingen|sprak|spraken|kochten|tot op heden)\b",
    re.I,
)
HEBBEN = {"heb", "hebt", "heeft", "hebben"}
ZIJN = {"ben", "bent", "is", "zijn"}

errors = []


def err(entry_id, msg):
    errors.append(f"[{entry_id}] {msg}")


def is_letter(ch):
    return ch.isalpha()


def annotate(sentence, terms):
    """Mirror of annotate() in app.js: sequential, whole-word, case-insensitive."""
    low = sentence.lower()
    found, cursor = [], 0
    for term in terms:
        t = term.lower()
        hit = -1
        for start in (cursor, 0):
            i = low.find(t, start)
            while i != -1:
                before_ok = i == 0 or not is_letter(low[i - 1])
                after = i + len(t)
                after_ok = after >= len(low) or not is_letter(low[after])
                if before_ok and after_ok:
                    hit = i
                    break
                i = low.find(t, i + 1)
            if hit != -1:
                break
        if hit == -1:
            return None
        found.append((hit, hit + len(t)))
        cursor = hit + len(t)
    return found


def check_entry(e):
    i = e.get("id", "?")
    if list(e.keys()) != TOP_KEYS:
        err(i, f"keys/order differ from schema: {list(e.keys())}")
        return
    if e["id"] != e["word"]:
        err(i, "id must equal word")
    if e["type"] not in TYPES:
        err(i, f"bad type {e['type']!r}")
    if e["level"] not in LEVELS:
        err(i, f"bad level {e['level']!r}")
    if e["audio_query"] != e["word"]:
        err(i, "audio_query should equal word")
    for k in ("definition_nl", "definition_en", "category"):
        if not e[k]:
            err(i, f"{k} empty")

    is_noun = e["type"] == "noun"
    if is_noun:
        if e["article"] not in ("de", "het"):
            err(i, "noun needs article de/het")
        if e["verb_conjugation"] is not None or e["separable_prefix"] is not None:
            err(i, "noun must not have verb data")
        check_noun(e)
    else:
        if e["article"] is not None:
            err(i, "verb must have article null")
        if e["noun_inflection"] is not None:
            err(i, "verb must have noun_inflection null")
        check_verb(e)

    ex = e["examples"]
    if len(ex) != 3:
        err(i, f"needs exactly 3 examples, has {len(ex)}")
    for n, x in enumerate(ex):
        if list(x.keys()) != ["dutch", "english", "context", "highlight_terms"]:
            err(i, f"example {n + 1}: bad keys {list(x.keys())}")
            continue
        if n < 3 and not x["context"].startswith(CONTEXT_PREFIXES[n]):
            err(i, f"example {n + 1}: context should start with {CONTEXT_PREFIXES[n]!r}")
        spans = annotate(x["dutch"], x["highlight_terms"])
        if spans is None:
            err(i, f"example {n + 1}: highlight_terms {x['highlight_terms']} not found in order")
        if e["type"] == "separable_verb" and len(x["highlight_terms"]) < 2:
            # participles and joined infinitives are one word; only a split use needs two terms
            t = x["highlight_terms"][0].lower()
            if t not in (e["word"], e["verb_conjugation"]["perfect_vtt"]["participle"]):
                err(i, f"example {n + 1}: separated use must track both parts")
    if len(ex) == 3 and not PAST_MARKERS.search(ex[2]["dutch"]):
        err(i, "example 3 must be in past or perfect tense")


def check_noun(e):
    i = e["id"]
    n = e["noun_inflection"]
    if not isinstance(n, dict) or list(n.keys()) != NOUN_KEYS:
        err(i, "noun_inflection keys wrong")
        return
    if not n["singular"].startswith(e["article"] + " "):
        err(i, "singular must start with the entry's article")
    if n["singular"].split(" ", 1)[1] != e["word"]:
        err(i, "singular must contain the word")
    if not n["plural"].startswith("de "):
        err(i, "plural must use de")
    if not n["diminutive_singular"].startswith("het "):
        err(i, "diminutive singular must use het")
    if not n["diminutive_plural"].startswith("de "):
        err(i, "diminutive plural must use de")
    dim = n["diminutive_singular"].split(" ", 1)[1]
    if not re.search(r"(je|tje|etje|pje|kje)$", dim):
        err(i, f"diminutive {dim!r} lacks a -je suffix")
    if n["diminutive_plural"].split(" ", 1)[1] != dim + "s":
        err(i, "diminutive plural must be diminutive + s")


def split_variants(s):
    return [v.strip() for v in s.split("/") if v.strip()]


def check_verb(e):
    i = e["id"]
    v = e["verb_conjugation"]
    if not isinstance(v, dict):
        err(i, "verb needs verb_conjugation")
        return
    if v["infinitive"] != e["word"]:
        err(i, "infinitive must equal word")
    if v["auxiliary"] not in ("hebben", "zijn"):
        err(i, "auxiliary must be hebben or zijn")
    if list(v["present_ott"].keys()) != OTT_KEYS:
        err(i, "present_ott needs all 7 pronouns in order")
    for k, form in v["present_ott"].items():
        if not form.strip():
            err(i, f"present_ott.{k} empty")
    if list(v["past_ovt"].keys()) != ["singular", "plural"]:
        err(i, "past_ovt keys wrong")
    p = v["perfect_vtt"]
    aux_ok = HEBBEN if v["auxiliary"] == "hebben" else ZIJN
    if p["auxiliary"] not in aux_ok:
        err(i, f"perfect auxiliary {p['auxiliary']!r} does not match {v['auxiliary']}")
    if p["full_example"] != f"{p['auxiliary']} {p['participle']}":
        err(i, "full_example must be auxiliary + participle")
    if not v["imperative"].strip():
        err(i, "imperative empty")

    if e["type"] == "separable_verb":
        pre = e["separable_prefix"]
        if not pre or not e["word"].startswith(pre):
            err(i, "separable_prefix must begin the infinitive")
            return
        for k, form in v["present_ott"].items():
            for var in split_variants(form):
                if pre not in var.split():
                    err(i, f"present_ott.{k} variant {var!r} must contain the split prefix {pre!r}")
        for k, form in v["past_ovt"].items():
            if pre not in form.split():
                err(i, f"past_ovt.{k} must contain the split prefix")
        if not p["participle"].startswith(pre + "ge") and not p["participle"].startswith(pre):
            err(i, "participle must begin with the prefix")
        for var in split_variants(v["imperative"]):
            if pre not in re.sub(r"[!?.]", "", var).split():
                err(i, f"imperative {var!r} must contain the split prefix")
    else:
        if e["separable_prefix"] is not None:
            err(i, "non-separable verb must have separable_prefix null")


def main():
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, list) or not data:
        print("lexicon.json must be a non-empty array")
        return 1
    ids = [e.get("id") for e in data]
    if len(set(ids)) != len(ids):
        err("*", "duplicate ids")
    for e in data:
        check_entry(e)

    if errors:
        print(f"FAILED — {len(errors)} problem(s):")
        for m in errors:
            print("  " + m)
        return 1

    kinds = {"de": 0, "het": 0, "verb": 0, "separable": 0}
    for e in data:
        if e["article"] == "de":
            kinds["de"] += 1
        elif e["article"] == "het":
            kinds["het"] += 1
        elif e["type"] == "separable_verb":
            kinds["separable"] += 1
        else:
            kinds["verb"] += 1
    print(f"OK — {len(data)} entries valid ({kinds})")

    if "--write-js" in sys.argv:
        body = json.dumps(data, ensure_ascii=False, indent=2)
        JS_PATH.write_text(
            "/* Generated by tools/validate.py --write-js from data/lexicon.json. Do not edit. */\n"
            f"window.__LEXICON__ = {body};\n",
            encoding="utf-8",
        )
        print(f"wrote {JS_PATH.relative_to(ROOT)}")
    else:
        if JS_PATH.exists():
            js = JS_PATH.read_text(encoding="utf-8")
            m = re.search(r"window\.__LEXICON__ = (.*);\s*$", js, re.S)
            if not m or json.loads(m.group(1)) != data:
                print("WARNING: data/lexicon.js is out of sync — run with --write-js")
                return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
