# Preparation V2 qualification

15 November 2026. Owner: [GEN-3659](https://app.notion.com/p/418a1ee8bd0680c99343ea23eb42d0dd).

Sixteen guides expose their official source, review date, requirements, documents
and steps. The top-right modal action remains visible while scrolling. Requirement
and document marks are independent; Save commits drafts, progress stays personal,
and format-1 plans retain their old bytes while new saves use format 2.

## Evidence and source boundaries

- [Attempt 4](attempt-4/preparation-browser.json), source
  `5ee0c7a1b43daae8256138802649aa20ae78deb7`:
  P01, P02, P03a/P03b, P04, P05 and P06 passed in actual Chromium 158.0.8127.18 /
  Node 24.22.2. All 16 dialogs, source/steps/documents, draft/save/reload,
  complete-list wording, actual chooser/download, actual V1-client storage,
  two real tabs and a labelled failing-write fixture were exercised.
  The seven passed functional assertions did **not** close visual acceptance.
- [Attempt 5](attempt-5/preparation-visual.json), source
  `77bac4529e99dc313b92e4b495973d7219d786c9`: V01 verified stable desktop
  paint. The immediate original capture has one color; after native scrolling
  settles the original capture has 1,509 colors and visibly renders the modal.
  V02 failed: the 320px viewport had a 378px layout and a clipped modal.
  Original screenshots, the failed assertion and complete command streams remain.
- [Attempt 6](attempt-6/preparation-visual.json), source
  `257d25636fb83a347ed4be988652c04b8db3da22`: changed V02 passed after one
  CSS rule restricted to widths at most 360px constrained the decorative
  illustration and wrapped the header/navigation. The layout and visual viewport
  are both 320x844; the modal is x=19, y=12, width=282, height=820 before scrolling,
  after scrolling and after saving. Real taps add the guide, save one independent
  criterion/document mark and reopen both. Original final screenshots were viewed.

All public runtime bytes except the narrowly appended CSS rule match attempt 4.
The source manifests bind both revisions; no JavaScript, catalogue, persistence
logic or style rule for widths above 360px changed. Unchanged functional cases
and V01 were retained on their checked source, not reported as a fresh rerun
on the new whole CSS file. V02 replaces the affected 320px functional/visual
boundary. P06 is an authored failing Storage.setItem method in a real browser,
not proof of native OS quota exhaustion.

Each browser run recorded native Chromium PID, normal exit code 0, absent native
process and closed contexts. Runner receipts separately prove normal server exit
0, absent server process group, stable source, clean checkout, no lingering owned
browser process and removal of owned tools. Only finite same-origin static GETs
were allowed; no app submission, model/provider, login or private user record was
used. CI job wall time through attempt 6 is 136 seconds; attempt 1 launched no job.

## Preserved failures

Attempt 1 had no jobs because runner context was used at job-level env.
Attempt 2's shallow checkout lacked the pinned real V1 assets; its original ZIP
and SHA-256 are retained. Attempt 3 stopped at an exact accessible button label
that omitted the rendered arrow; no case passed. Attempts 4 and 5 retain the
blank immediate frame and clipped narrow geometry. None was erased or labelled
a pass to close the visual boundary.

## Delivery and local state

The ordinary workflow is versioned for this edition: R01-R04 live in
`tests/e2e/journeys-v2.mjs`, with 16 guides, five explicit employment IDs,
document-only selectors and refused format 3. The historical `journeys.mjs`
and B01-B05 receipts remain unchanged. Ordinary current-edition CI and actual
Vercel READY/served-byte/native hosted observation are separate pending checks
at this source-publication checkpoint.

The default branch's seven catalogue-only advances were preserved, including its
current `public/data/calls.json`. The temporary QA ref was created atomically
with deployment disabled; its overlay and active one-off workflow are excluded
from the production tree. The existing daily catalogue workflow and production
deployment settings are unchanged.

Mac Storage Guard declined at 1.0/34.0 GiB; later free capacity reached about
116 MiB and a small patch failed with ENOSPC. No local install, build, app server,
browser or database was started. Immutable remote Git objects safely retain the
qualified source and originals; local source/index/refs were preserved. The new
CSS, corrected workflow/helpers and these remote receipts are not yet reconciled
into the dirty Mac checkout. Do not reset, clean or overwrite it to synchronize.

Government eligibility/award, a successful real application, external calendars,
physical-device behavior and future service availability remain outside proof.
