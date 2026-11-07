# Public catalogue refresh — 7 November 2026

**A bounded live refresh succeeded.** [Catalogue attempt 2](https://github.com/alvarovillalbaa/ayudario/actions/runs/42399760244), job `128484791018`, checked source [`ba05a0d2ab0b80d721f5ff82e9563e950675f837`](https://github.com/alvarovillalbaa/ayudario/commit/ba05a0d2ab0b80d721f5ff82e9563e950675f837) with Node 24.22.2. Its 18 BDNS integration cases passed with zero failures, cancellations or skips, followed by the actual anonymous official GET and publication of 50 normalized public call records.

The [observation JSON](catalogue-attempt-2.observation.json) and [raw log](catalogue-attempt-2.raw.log.gz) retain the run and data identities:

| Field | Observed value |
| --- | --- |
| Fetch time | `2026-11-07T18:08:32.697Z` |
| Registration window | `2026-10-09` through `2026-11-07` |
| Published data commit | [`da4ab00b46c77e4f2e149e83cd56172427e87414`](https://github.com/alvarovillalbaa/ayudario/commit/da4ab00b46c77e4f2e149e83cd56172427e87414) |
| Only changed path | `public/data/calls.json` |
| File size / items | 20,888 bytes / 50 |
| SHA-256 | `66b4d8eb4335077b9c13c67b76001a97c894fbe59d2200990d5876ea8878b5f8` |

This is one page of the [official BDNS call search](https://www.infosubvenciones.es/bdnstrans/GE/es/convocatorias), filtered to people without economic activity and a 30-day registration window. It is not a comprehensive catalogue. Registration dates are not deadlines; a recent record establishes neither an open application period, available funds nor personal entitlement. No amounts are promised or calculated.

## Failure, diagnostic and correction

The [first refresh log](catalogue-attempt-1.raw.log.gz) retains exit 1 after payload validation failed; that attempt did not produce an accepted live catalogue. A separate [read-only diagnostic](bdns-diagnostic-1.json), with its [raw log](bdns-diagnostic-1.raw.log.gz), made one anonymous GET and observed HTTP 200, a complete 21,329-byte JSON response and parser refusal `payload`. It wrote no public file and retained structural metadata and a body hash, not the raw response body. Its control-character flags did not identify the particular character.

The corrected parser permits bounded public title whitespace while continuing to reject other prohibited controls and malformed records. The later committed normalized dataset itself contains **one LF in one title**; that observation supports the whitespace correction without retroactively claiming that the earlier diagnostic identified an LF. The successful bot commit changed only the public data file.

## What this result does not replace

The 13 profile/plan cases and four browser journeys from [source `5da5391`](application-checks.md) are unchanged prior evidence. They were not re-executed as part of a new 31-case invocation. The 18 integration cases and live refresh establish the producer boundary. A later, separate [actual hosted B05 acceptance](hosted-catalogue.md) binds this 50-record dataset to the rendered alias without re-running B01–B04.

Vercel reported generated-data commit `da4ab00` READY as deployment `dpl_DsAEnzTWcUZdjSUoQ9wLgdDcdYi8` for `ayudario-xi.vercel.app`; this is deployment metadata, not an actual browser observation. The [earlier hosted HTTP observation](hosted-attempt-1.observation.json) served the empty catalogue and cannot establish delivery of these new bytes. Future scheduled refreshes, source availability and changing programme conditions remain outside this single successful observation.
