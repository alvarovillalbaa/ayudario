# Preparation iteration

Date: 2026-11-14. Base: `782285b35d36ac2075c65be05190e1b92fdf5167`.
Owner: [GEN-3659](https://app.notion.com/p/418a1ee8bd0680c99343ea23eb42d0dd).
Local, uncommitted and unpublished. The hosted first edition remains unchanged.

## Implementation

- Eight new source-reviewed guides bring the maintained catalogue to **16**.
  Each has requirements, documents, steps, official source and its own review
  date. The original eight and their document/requirement ordering remain intact.
  Actual sources and research limits are in [catalogue provenance](../../../catalogue.md).
- The modal's sticky top-right action adds the guide. Saved guides show independent
  requirements reviewed and documents prepared, with total/remaining counts,
  progress bar, next unchecked item and live unsaved-form feedback. Plan cards
  summarize committed preparation. All checks are the user's own declarations;
  no eligibility, amount, successful application or government validation follows.
- Plan format 2 imports format 1 without changing old notes, document marks,
  reminders or status. New criteria start unchecked. The separate v2 storage key
  preserves old v1 bytes during read/save. Corrupt/future current data is refused
  without an older-data fallback; changed observed current bytes are refused on
  save, followed by exact readback verification. This is not atomic concurrency
  protection. Explicit persistence disable/clear removes both versions.

## Actual checks

Under Node **26.8.2**:

```
node --test tests/unit/matcher.test.mjs tests/unit/plan.test.mjs tests/unit/preparation.test.mjs tests/unit/preparation-ui.test.mjs
npm run check
git diff --check
```

**24/24 passed**: existing profile/plan/calendar checks adapted to the expanded
catalogue and compatible v2 format, seven new plan/storage cases, and four actual
UI-callback cases with controlled DOM/storage. They cover top action, all-guide
rendering, documents/steps, draft vs saved progress, independent reload checklists,
legacy preservation and refusal to overwrite corrupt data. The existing test of
unknown future formats now uses version 3; it still refuses unknown versions.
Syntax and JSON checks passed across **51 source files** before this receipt/docs
were added. Diff checks passed after edits.

The first UI run passed 2/4: U01 and U04 expected numeric `textContent` while the
DOM correctly coerces it to a string. The two test assertions were corrected;
all four passed without changing application behaviour or acceptance scope.

No browser, live localStorage, real form submission, government application,
BDNS importer integration or new public refresh ran. Existing frozen browser,
refresh and hosted receipts remain on their original sources. The storage reserve
prevents local installs/builds/servers/browser work; none was attempted here.

## Pending acceptance

Actual 390/320 px toolbar visibility, scrolling/keyboard/focus, form save/reopen,
legacy reload, blocked/quota/conflicting storage and complete-list wording need
browser evidence on this source. Source publication and exact hosted comparison
are pending. No workflow, infrastructure, dependency, database, account or
private-data export was changed. The new local plan is not a cloud backup.
