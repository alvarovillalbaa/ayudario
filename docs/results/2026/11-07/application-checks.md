# Application checks — 7 November 2026

**Accepted scoped T2 checks:** [focused attempt 2](https://github.com/alvarovillalbaa/ayudario/actions/runs/42398037434) checked source [`5da539101838b0b935bd731fb06a9d9be3d6907c`](https://github.com/alvarovillalbaa/ayudario/commit/5da539101838b0b935bd731fb06a9d9be3d6907c), using Node 24.22.2 and Chromium 158.0.8127.18 against the owned loopback server.

| Case | Actual passed identity |
| --- | --- |
| B01 | Desktop profile, official guide, checklist, notes, calendar and opt-in reload |
| B02 | Narrow touch-emulated discovery and session-only application progress |
| B03 | Real JSON chooser, replacement confirmation, hostile text, backup and clear |
| B04 | Blocked storage and refused catalogue preserve an operable in-memory plan |

The same run passed **29 domain cases: 13 matcher/plan cases and 16 authored BDNS boundary cases**, with zero failures, cancellations, skips or todos. These are fixture checks, not evidence of a successful live BDNS refresh.

## Retained evidence and source identity

- [Attempt 2 originals](focused-attempt-2.originals.zip) and [raw job log](focused-attempt-2.raw.log.gz) retain the TAP output, browser report, screenshots, source snapshots, server cleanup, two downloaded JSON backups and the downloaded ICS file. All 12 emitted proof files were independently reconstructed from the log's bounded base64/gzip records and matched their retained bytes and SHA-256 values.
- Before/after source snapshots are byte-identical. All **30 tracked paths / 168,304 bytes** match the checked Git commit by membership, byte count and SHA-256. The snapshot SHA-256 is `71fa752a626fdc5956b49a01fbfca81828635acf9977b56b34bd7ceff2524100`.
- Desktop and narrow screenshots are 1280×900 and 390×844. The 425-byte CRLF calendar file records 29 February 2028 through 1 March, without the authored private note. The retained backups are 581 and 162 bytes.
- Server cleanup records `originalStatus: 0`, `signalStatus: 0`, `waitStatus: 0` and `processAbsent: true`: the intentional server TERM completed with a normal exit. This is a recorded PID check, not a host-wide process audit.

## Preserved failure and limits

[Attempt 1](https://github.com/alvarovillalbaa/ayudario/actions/runs/42397521949), source `67b9dced83ce2f9af998cd709449ac7705853646`, remains failed in its [original archive](focused-attempt-1.originals.zip) and [raw log](focused-attempt-1.raw.log.gz). B01 expected one search result and observed two; B02–B04 were unrun. The later source corrected the assertion to the two matching guides; it did not turn the failed receipt into a pass.

The browser used authored plans, feed responses and an unavailable-storage shim. Narrow touch emulation is not a physical-device test. Official source links were checked without submitting an application. Downloaded ICS bytes do not prove calendar import or notifications. Boundary assertions cover the finite static requests observed within each case; no complete OS descendant ledger is retained.

The [initial anonymous hosted HTTP observation](hosted-attempt-1.observation.json) matched eight static bodies, including the **398-byte empty catalogue**. It is not a hosted browser run or delivery proof for the later live dataset. See the separate [catalogue refresh result](catalogue-refresh.md); live B05 renderer verification is still pending at this checkpoint.
