# Public BDNS discovery

The importer requests only public call metadata from the official
[SNPSAP/BDNS API](https://www.infosubvenciones.es/bdnstrans/estaticos/doc/snpsap-api.json).
It never requests concessions, recipient identities or a user profile. Attribution
is retained as Intervención General de la Administración del Estado (IGAE), with
official call links. No API key or application dependency is needed.

`node scripts/refresh-calls.mjs` makes one GET to
`https://www.infosubvenciones.es/bdnstrans/api/convocatorias/busqueda`:

- `vpd=GE`, `page=0`, `pageSize=50`, `tiposBeneficiario=1`.
- The inclusive UTC calendar window runs from today minus 29 days through today;
  `fechaDesde` / `fechaHasta` use the API's `DD/MM/YYYY` format.
- Results request `order=fechaRecepcion&direccion=desc`. There is no pagination,
  detail fanout, parallel request or automatic retry.
- The entire fetch/body operation has a 15-second deadline, rejects redirects and
  non-200/non-JSON responses, and bounds the decoded body at 1 MiB.

The pure `parseBdnsResponse` validates the response page, item bounds, unique BDNS
string codes, bounded public metadata and refresh-window metadata. It preserves
`fechaRecepcion` as bounded source text in `registeredAt`; it does not invent an
update timestamp, deadline or open status. Internal numeric row IDs and supplied
links are ignored; source links are constructed from the stable BDNS code under
the official HTTPS portal. The fetch helper accepts an injected fetch function
and smaller limits for authored tests; the CLI uses the fixed production limits.

Only a fully fetched and validated response becomes a public snapshot. The CLI
writes and fsyncs an exclusive sibling temporary file, then atomically renames it
to `public/data/calls.json`. Failure before that commit point preserves existing
file bytes; failed temporary writes are cleaned up. This is atomic replacement,
not a claim of crash/power-loss durability. The initial empty file with
`fetchedAt:null` is owned by the app and is not synthesized by a failed refresh.

The public shape is `{version:1,source:{name,url},fetchedAt,window:{from,to},items,
warning}`. Each item has `{id,title,agency,registeredAt,sourceUrl}`. Upstream legal
warnings and the bounded-catalogue notice remain in `warning`. Rendering must
treat all source strings as text.

The daily overlapping 30-day window deliberately caps the catalogue at 50 items.
It is not a comprehensive Spanish aid database, and a recent registration does
not imply an open deadline or personal eligibility. Recipient type 1 covers
individuals without economic activity; it does not cover every self-employed aid.
Registration dates do not change when calls are edited. Edits to older calls,
removals, and entries outside this first page may therefore be absent. Failed
refreshes retain last-good data; consumers should show the successful fetch time
and an unavailable/stale state rather than assume that an empty result is fresh.

The [official best-practice guide](https://www.infosubvenciones.es/bdnstrans/estaticos/ayuda/Buenas%20pr%C3%A1cticas%20API%20SNPSAP.pdf)
documents 10 GET/IP/second, up to 10,000 rows/page, sequential access and overlapping
refresh strategies. This small importer stays below that request ceiling and
does not claim to implement a full historical mirror. Reuse remains subject to
the [official conditions](https://www.infosubvenciones.es/bdnstrans/GE/es/avisolegal),
including source attribution, preservation of date/terms metadata, and no implied
government endorsement. Public source metadata does not establish entitlement.

`tests/integration/bdns.test.mjs` is Tier 2: authored API responses, injected fetch
and disposable filesystem output. It does not establish live API availability,
Vercel connectivity or scheduled refresh execution. The earlier bounded live
probe on this Mac received no HTTP status; no live retry is part of these tests.
