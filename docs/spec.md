# España ayudas — Ayudario

## Owner intent and interpretation

The [personal Notion brief](https://app.notion.com/p/40da1ee8bd0680638e87f69899520d19), returned snapshot 3 November 2026, says “Hacer algo como esto de abajo pero auto-gestionable” and references [Wizbii Money](https://www.wizbii.es/money). Its parent is [the personal portfolio](https://app.notion.com/p/311a1ee8bd06805caa21c5306dd315ac). This is a new priority project, independent of the four deferred apps.

The reference offers profile-based discovery of Spanish public aid and assisted application preparation. Ayudario makes that flow self-service: discover relevant programmes, understand remaining requirements, prepare a checklist, keep personal progress and open the official application route. The application does not claim to decide entitlement, submit an application, represent a public authority or guarantee money.

## Required first release

1. A responsive Spanish application with searchable, category-filtered official programme guides, readable details and visible source/review dates.
2. An optional bounded adult profile (territory, age, employment and broad household priorities), transparent relevance reasons and visible unresolved criteria. Topic matching is not an entitlement calculator. No aggregate promised amount or invented deadline.
3. A personal plan with saved guides, preparation checklist, notes, manually recorded progress and a personal calendar reminder. Leaving the browser does not imply an application was submitted.
4. Explicit opt-in device persistence, bounded validated JSON backup/import, clear-all, and useful blocked-storage/recovery errors. Profile answers never leave the browser. No names, identifiers, bank details, credentials or document files are collected.
5. Automated public BDNS call discovery with official attribution, original registration/update metadata and last successful fetch time. Recent does not mean open or personally eligible. Failed refresh retains last-good data and exposes freshness; initial absence must be explicit. No concession/recipient records.
6. Separate personal GitHub repository, free Vercel delivery, focused domain/API/browser proof and documented limits. No paid service, cloud database or model provider is needed for this data boundary.

## Data and deployment

Static native ES modules keep private profile and plan processing on-device. A serialized daily GitHub job fetches a bounded public BDNS catalogue and updates only its owned public JSON file; Vercel serves the committed result. No profile-dependent request goes to BDNS or the application server. This separates profile privacy from public-data refresh and avoids adding shared-storage/Auth capacity requirements.

The [official OpenAPI](https://www.infosubvenciones.es/bdnstrans/estaticos/doc/snpsap-api.json) defines call search. The [official best-practice guide](https://www.infosubvenciones.es/bdnstrans/estaticos/ayuda/Buenas%20pr%C3%A1cticas%20API%20SNPSAP.pdf) requests sequential, cached retrieval and overlapping refreshes because registration dates do not change on edits. Implementation preserves that distinction. The [first live refresh](results/2026/11-07/catalogue-refresh.md) and [hosted renderer observation](results/2026/11-07/hosted-catalogue.md) are accepted on their recorded sources.

## Verification and release limits

Use authored T2 fixtures for matcher/import/catalogue-boundary checks. Browser scenarios cover actual desktop/narrow profile discovery, save/checklist/reload, backup/import/clear and unavailable catalogue/storage recovery. A separate bounded official public GET establishes source connectivity; fixtures cannot stand in for it. Keep exact checked source and outputs, then verify personal GitHub and actual Vercel delivery separately. Storage Guard prohibits local installation, builds, servers and browser execution; use owned free Ubuntu CI.

The [first application packet](results/2026/11-07/application-checks.md) closes requirements 1–4 on its exact source with authored profiles and loopback Chromium, including touch emulation. The separate real refresh and anonymous hosted observation close the first-release public-data/delivery boundary in requirements 5–6. These sources and limits remain distinct; future programme changes, scheduled-service availability and actual government decisions are not asserted by this release.
