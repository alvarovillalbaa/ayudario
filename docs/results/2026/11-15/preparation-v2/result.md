# Preparation V2 qualification

15 November 2026. Owner: [GEN-3659](https://app.notion.com/p/418a1ee8bd0680c99343ea23eb42d0dd).

Sixteen guides expose their official source, review date, requirements, documents
and steps. The top-right modal action remains visible while scrolling. Requirement
and document marks are independent; Save commits drafts, progress stays personal,
and format-1 plans retain their old bytes while new saves use format 2.

Delivered at [Ayudario](https://ayudario-xi.vercel.app). Current ordinary CI passed
42 domain cases plus R01-R04; actual anonymous production H01 matched all eight
public resources and security headers and exercised the corrected 320px UI.
See the separate source boundaries below; these are not one combined execution.

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
document-only selectors and refused format 3. Historical `journeys.mjs`
and B01-B05 remain unchanged. [Current ordinary CI](ordinary-ci/summary.json)
on release `24f906de413f11afab19305b953448327fcea1c2` passed **42/42** Node
cases (0 skipped, 180.854 ms) plus all four actual Chromium journeys. Its
[original browser report](ordinary-ci/browser.json), TAP, complete streams,
before/after source manifests and images are retained. Browser/server/tools
closed normally, with stable source and no owned process left behind.

Vercel deployment `dpl_BA7GzXkARW6F7xfmaRdiYALQEswk` was observed READY,
production target, exact release SHA and the public alias. The separate
[actual hosted report](hosted/hosted.json), driven by
`8dbafc5364e94a7b6e7982bbbe6a94e7e63ae346`, anonymously fetched all eight
resources from `https://ayudario-xi.vercel.app`: HTTP 200, exact bytes/SHA-256
and declared CSP, referrer, nosniff and permissions headers all matched.
A fresh real 320px Chromium context loaded 16 guides, added one guide, saved
independent criterion/document marks and closed the fitted modal. Session-only
localStorage remained empty; seven finite static GETs, zero unexpected requests
or browser errors were observed. The [original screenshot](hosted/hosted-preparation.png)
was viewed. Native process exit 0/absence and owned-tool removal were verified;
no local loopback app server was started for hosted observation.

[Retirement readback](retirement.json) records DELETE 204 and subsequent GET 404
for only the owned exact-SHA QA branch, after hosted success and verification
of the unchanged main release/tree. The active one-off workflow was absent on
main before retirement; the final tree also excludes it. Vercel reports zero
deployments for that QA branch. Its bounded cleanup job used a separate
contents:write token only for the leased ref deletion; it did not write main.
The exact retired [workflow source](source/hosted-v2.workflow.yml.example)
and hosted driver/controller sources are preserved as inactive text.

CI job wall time across all attempts, ordinary CI, hosted readback and branch
retirement is **191 seconds**, within the 20-minute limit; this is not a billing
claim. Source proof, real delivery and the older first-release observations
remain separately identified. Final evidence publication changes documentation
only relative to the qualified release tree and retains its public bytes.

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
