# Hosted catalogue observation — 7 November 2026

**B05 passed against the actual public alias.** [Run 42401148158](https://github.com/alvarovillalbaa/ayudario/actions/runs/42401148158), job `128488949329`, checked source [`f9cee29ba5d2da884464d2cc440fa6c6a2b5bd2f`](https://github.com/alvarovillalbaa/ayudario/commit/f9cee29ba5d2da884464d2cc440fa6c6a2b5bd2f); activation was `3e700171e32380eb5d72a95e86b171772aff81e5`. Node 24.22.2, Playwright 1.65.0 and Chromium 158.0.8127.18 observed `https://ayudario-xi.vercel.app` from `18:25:05.778Z` to `18:25:07.228Z`.

The single case was **“Hosted public catalogue matches the committed BDNS bytes and renders all fifty official announcements as text.”** It did not invoke or carry forward the [localhost B01–B04 journeys](application-checks.md).

## Actual bindings

- The application's existing catalogue fetch returned HTTP 200 and `application/json; charset=utf-8`. Its retained decoded response is exactly **20,888 bytes**, SHA-256 `66b4d8eb4335077b9c13c67b76001a97c894fbe59d2200990d5876ea8878b5f8`, byte-identical to the checked source's committed catalogue.
- All **50 ordered DOM rows** match their exact title `textContent`, agency and official href. This includes the one LF-bearing title, ID `940312`. Each row has one `_blank` link with `noopener noreferrer`, with no observed injected script, image or iframe. All eight guide IDs also match the checked catalogue.
- The UI displays `Última descarga correcta · 7 nov 2026, 19:08`, exactly matching the catalogue's `2026-11-07T18:08:32.697Z` fetch time in the browser's Europe/Madrid timezone. At the UI observation it was 994,362 ms old; the retained registration window is 9 October–7 November.
- **Seven observed GETs** remain within the finite same-origin static path policy, including exactly one `/data/calls.json` request. The error list is empty. One page was created; persistence remained off and the plan count remained zero. No profile or plan was entered, and no official application link was followed.
- Context/page close and browser disconnect were observed during requested normal closure; cleanup errors are empty. This is browser API/event evidence, not proof that every OS browser process was absent.

## Originals and limits

[Original files](hosted-catalogue.originals.zip) and the [raw log](hosted-catalogue.raw.log.gz) preserve the JSON report, 1280×900 screenshot and both source snapshots. All four emitted base64/gzip originals independently reconstruct to the retained files: 287,298 decoded bytes / 222,849 gzip bytes. The report is 58,529 bytes, SHA-256 `a266ce83734cb866c5510a1e98f0ba1193cc1d0a8e27bcb872c83e417c6c8b2a`.

The before/after snapshots are byte-identical; all **46 tracked paths / 938,837 bytes** match the checked Git source by membership, size and SHA-256. Their snapshot SHA-256 is `31f38c869d076ae29ff804ee6cf8ca023121171c5657aad95cefa556bb42f026`.

This is one anonymous desktop observation at the recorded time. Catalogue equality binds the decoded HTTP representation, not compressed wire bytes, every deployed application asset or a particular deployment commit. Passive request observations are not a general egress firewall. The [live producer result](catalogue-refresh.md) remains separate; recent registrations establish neither an open deadline, eligibility nor entitlement. No physical-device, application-submission, award, account, model or private-data proof is claimed.
