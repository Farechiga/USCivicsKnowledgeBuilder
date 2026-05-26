# Content Style Guide — USCIS 2025 Civics Knowledge Base

The quality bar. Every entry passes this before `source_verified` is set.
Goal: a **first-class educational tool** that delights a curious kid AND a serious adult — in one crisp voice.

---

## 0. THE VOICE — read this first, it is the most important rule

Write the way you would tell a curious 8-year-old something amazing: **short sentences, plain words, one idea at a time.** Keep the real substance and the stakes — just say it in the fewest words that still land.

If an adult finds it a touch simple, good. If a kid's eyes glaze, we failed.

**Hard rules:**
- **Be brief.** `why_it_matters` and `fun_fact`: 2–3 short sentences, and the schema enforces a hard ~360-character cap. If you're near the cap, cut.
- **Kill trivia.** Cut every name, date, or detail that isn't the point. "Benjamin Franklin" earns its place; "Elizabeth Powel" and "the journal is in the Library of Congress" do not — a kid skips them. Test each detail: *does this make a child more curious about our country?* If not, delete it.
- **No throat-clearing.** Never open with "Here's the radical part" or "The deep idea is." Start with the thing.
- **Still land the "so what."** Concise is not hollow. Keep the one line that says why it mattered.
- **Read it aloud.** Lose a bright kid before the end? Cut more.

**Our real Q1 fun fact — the lesson:**
- TOO VERBOSE (rejected): "As the Constitutional Convention closed in 1787, Elizabeth Powel asked Benjamin Franklin... A delegate wrote it down, and that journal sits in the Library of Congress today..."
- CRISP (good): "After the Convention, someone asked Benjamin Franklin: did we make a republic or a monarchy? 'A republic,' he said, 'if you can keep it.' His point: this government was brand-new, and keeping it would take work from every generation."

There is **one** `text` per field — no separate kid/adult versions. The one voice serves both.

---

## 1. Source of truth & sourcing discipline

- **Questions and answers** are verbatim from **USCIS M-1778 (09/25)**. Never paraphrase the official answer or invent accepted answers.
- **`fun_fact.source_url`** must be on the tier-1 whitelist (CI-enforced): archives.gov, constitution.congress.gov / congress.gov / house.gov / senate.gov / loc.gov, constitutioncenter.org, icivics.org, billofrightsinstitute.org, si.edu.
- **`mnemonic.source_url`** may use an appropriate source outside the whitelist (it anchors a memory device, not a civics claim).
- `source_verified: true` only after a human/agent opens the link and confirms it supports the claim.

## 2. Grading vs. teaching

- **`key_elements` (grading): LEAN.** Only what must be present to be correct. Never stricter than a real officer.
- **`concepts` (teaching): DEEP but still crisp.** Over-elaborate recurring big ideas once in `concepts.json`; reference by `concept_ids`. Don't re-explain a concept inside each question.

## 3. The "also known as" rule

When terms are synonyms, overlap, or are confusable, add `disambiguation` — plain prose, friend-explaining-it voice (e.g., republic = representative democracy ≠ direct democracy; "supreme law" ≠ "Supreme Court"). When there's more than one official answer, add a short `lead_in`.

## 4. Register (the tone of the one crisp voice)

- `celebratory` — default for government/symbols/founding ideas. Inspiring, grounded, no empty boosterism.
- `reflective` — for unfinished-business items (voting rights expanding over time). Honest pride: imperfect, still the best yet for representation and freedom; never "finished."
- `somber` — for heavy items (slavery, Civil War, 9/11). Dignified, never forced cheer. Stay age-considerate by careful wording, NOT extra length.

`kid_mode` is an experience layer (daughter-as-examiner, pacing, which items appear), not a text swap.

## 5. Mnemonics & micro-stories

- `mnemonic`: a memory device, may be whimsical, always `is_memory_device: true`.
- `micro_story`: 2–3 crisp sentences for people/events.

## 6. Definition of done (per question)

- [ ] Official answer(s) verbatim from M-1778; `key_elements` lean
- [ ] ONE crisp voice; under the length cap; no trivia
- [ ] `why_it_matters` lands the "so what," correct register
- [ ] `fun_fact` is genuinely surprising, lands its "so what," tier-1 sourced, `source_verified: true`
- [ ] `lead_in` if multiple answers; `disambiguation` if confusable
- [ ] Passes the Voice Gate (see auditing guidelines) and validates against the schema
