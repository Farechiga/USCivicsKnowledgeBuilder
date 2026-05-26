# Drafting & Auditing Guidelines

Companion to `CONTENT_STYLE_GUIDE.md`. Read §0 of the style guide (THE VOICE) first — it governs everything here.

---

## THE VOICE GATE — run this FIRST, before anything else

Every `why_it_matters` and `fun_fact` must pass all three:

1. **Is this clear and compelling for a kid?**
2. **Would a bright kid's eyes glaze over hearing this?** (If yes → cut or rewrite.)
3. **Does every detail enhance a child's wonder about our country?** (If a detail doesn't → delete it.)

Plus the mechanical check: **2–3 short sentences, under the ~360-char cap.** If it fails any of these, it does not ship — no matter how accurate or sophisticated it is.

---

## PART 1 — DRAFTING (field by field)

### `lead_in` (include when more than one official answer)
Short, conversational handoff. GOOD: "You could describe it any of these ways (you only need one):"

### `disambiguation` (include when terms are synonyms / confusable)
Plain prose untangling the names. GOOD: "We most often hear it called a 'representative democracy' — the same idea as a 'republic.' That's different from a 'direct democracy,' where people vote on every law themselves." GOOD (look-alikes): "The 'supreme law' is the Constitution — not the 'Supreme Court.' One is the rulebook; the other is the referee."

### `why_it_matters` (required)
Crisp kid voice. Must be:
- **Non-circular** — don't define a word with the same word.
- **Differentiating** — say what makes this distinctive vs. a king, a direct democracy, an unwritten system. If it could describe any government, rewrite.
- **So-what** — keep the one line that says why it mattered.
- BAD (real Q3 v1): "...building the machinery of government while fencing that same government in with rights the people keep." → "fencing in" is awkward and abstract.
- GOOD (Q3): "It builds the government — a Congress to make laws, a President to enforce them, courts to judge — and limits it too, by protecting people's rights."

### `fun_fact` (required)
Bar = **SURPRISE + MEMORABLE + SO-WHAT**, in crisp kid voice. Ask: would a well-read adult say "huh!" AND would a kid lean in? Then land why it mattered.
- Prefer: drama, irony, a vivid image, a "wait, really?" Avoid: textbook lines, bare dates, extra names, "the clause is in Article X."
- BAD (real Q2 v1, too dry): "The phrase 'supreme Law of the Land' comes from the Supremacy Clause (Article VI)..."
- BAD (real Q1 v2, too verbose): named Elizabeth Powel and the Library of Congress journal — trivia that buries the point.
- GOOD (Q2): "Long ago, Maryland tried to tax a national bank to death. The Supreme Court said no — one state can't destroy what the whole country builds. That's how we learned: national law beats state law."
- STILL REQUIRED: tier-1 source + `source_verified: true`.

### `mnemonic` / `micro_story`
Memory device (whimsical OK, labeled) / 2–3 crisp sentences for people & events.

---

## PART 2 — FULL AUDIT CHECKLIST

**Voice gate (above) — first and non-negotiable.**

**Content**
- [ ] Official answer verbatim from M-1778; `key_elements` lean
- [ ] ONE crisp voice; under the length cap; no trivia or throat-clearing

**Helper fields**
- [ ] `lead_in` if more than one answer; `disambiguation` if confusable

**`why_it_matters`**
- [ ] Not circular; differentiates from other forms of government; lands the so-what

**`fun_fact`**
- [ ] A bright kid leans in (not glazes); tells a vivid mini-thing, not a definition
- [ ] Lands its so-what; no dryness flags ("is in Article X," "was ratified in")
- [ ] Tier-1 source on the whitelist; `source_verified: true`

**Tone**
- [ ] Register fits; somber items dignified, not cheerful
