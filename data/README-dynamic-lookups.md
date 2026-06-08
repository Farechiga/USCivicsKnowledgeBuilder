# Dynamic Lookup Architecture (Option 3)

Questions whose answers change over time — current officeholders, state senators, etc. — use a `dynamic_lookup` answer type. The question JSON declares the *intent* of the lookup; `data/user-config.json` holds the actual current values for one specific user.

## The 6 dynamic questions in the test

| Q | Question | `dynamic.lookup` | `user-config.json` key |
|---|---|---|---|
| Q23 | Who is one of your state's U.S. senators? | `state_senator` | `officials.us_senators` (array — either element acceptable) |
| Q29 | Name your U.S. representative | `us_representative` | `officials.us_representative` |
| Q30 | Speaker of the House (starred) | `uscis_testupdates` | `officials.speaker_of_house` |
| Q39 | Vice President (starred) | `uscis_testupdates` | `officials.vice_president` |
| Q57 | Chief Justice | `uscis_testupdates` | `officials.chief_justice` |
| Q61 | Your state's governor (starred) | `state_governor` | `officials.state_governor` |

(Q62 — state capital — is technically not dynamic since capitals don't change, but it is per-state, so it lives in `user-config.json` too at `officials.state_capital`.)

## How the app should resolve a dynamic question

```javascript
// pseudocode
const question = loadQuestion(qid);
const userConfig = loadUserConfig();

if (question.answer_type === "dynamic_lookup") {
  const lookup = question.dynamic.lookup;
  let currentValue;

  switch (lookup) {
    case "state_senator":
      currentValue = userConfig.officials.us_senators; // array
      break;
    case "us_representative":
      currentValue = userConfig.officials.us_representative;
      break;
    case "state_governor":
      currentValue = userConfig.officials.state_governor;
      break;
    case "state_capital":
      currentValue = userConfig.officials.state_capital;
      break;
    case "uscis_testupdates":
      // Speaker/VP/Chief Justice — disambiguate by question id
      if (qid === 30) currentValue = userConfig.officials.speaker_of_house;
      else if (qid === 39) currentValue = userConfig.officials.vice_president;
      else if (qid === 57) currentValue = userConfig.officials.chief_justice;
      break;
  }

  renderQuestionWithDynamicAnswer(question, currentValue, userConfig.last_verified);
}
```

## The `uscis_testupdates` ambiguity

The schema's `dynamic.lookup` enum currently has only 5 values (`uscis_testupdates`, `state_governor`, `state_senator`, `us_representative`, `state_capital`). The Speaker / VP / Chief Justice all map to `uscis_testupdates` because that's the only generic enum value available. The app code above handles this by question-ID matching, which works but is brittle.

**Cleaner long-term:** extend the schema's `lookup` enum to add `speaker_of_house`, `vice_president`, and `chief_justice` as explicit values. Then the switch statement can drop the question-ID disambiguation. Schema bump → easy migration: update q030/q039/q057 to use the new enum value.

## Keeping `user-config.json` current

Three options, in increasing automation:

1. **Manual.** Before each study session, glance at `last_verified` and refresh if stale. Edit the file by hand using the URLs in `sources` to confirm current officeholders.
2. **Refresh script.** A `scripts/refresh-officials.js` could hit each URL in `sources`, parse the current value, write it back, and bump `last_verified`. (Some scrape-fragile; uscis.gov/testupdates is the most authoritative source for federal officials per USCIS guidance.)
3. **CI cron.** Run the refresh script weekly via GitHub Actions; open a PR when anything changes.

For a family study app where you'll know exactly when officials change (e.g., after the November midterms), option 1 is probably fine.

## Sharing the app

If you ever want to share this with someone in another state, the only file they need to swap is `data/user-config.json`. The question JSONs stay identical for everyone. Consider committing a `data/user-config.example.json` template with placeholders, and `.gitignore`-ing the real `data/user-config.json` — but that's only useful if multiple people fork the repo.
