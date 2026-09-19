# Sitzplan — Swiss Federal Assembly seat visualizer

A static site that visualizes the seating charts of the Swiss Federal
Assembly — the Nationalrat (200 seats) and the Ständerat (46 seats) — and
highlights the seats of parliamentarians involved in a given
[Curia Vista](https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista)
affair: its **Berichterstattung** (rapporteurs), the person it was
**eingereicht von** (submitted by), and who **bekämpft** (contested) it.

Enter one or more Curia Vista affair numbers (comma-separated, e.g.
`26.3533, 26.006`) and the relevant seats light up in the appropriate
chamber's hemicycle, in German, French, or Italian.

Live at **https://sitzplan.schlumpf.me**.

## How it works

- All parliamentary data — affairs, roles, rapporteurs, members, and the
  current seat roster — is fetched **live, at runtime, directly from the
  browser**, from the Swiss Parliament's official Open Data API at
  [`ws.parlament.ch/odata.svc`](https://www.parlament.ch/de/über-das-parlament/fakten-und-zahlen/open-data-web-services).
  There is no build-time data snapshot and no backend of any kind — this is
  a fully static site.
- Because `ws.parlament.ch` has no public API for seat _geometry_ (the
  official site's exact seat-wedge SVG paths are hardcoded in its
  proprietary client bundle), the hemicycle layout here
  (`src/lib/layout/hemicycle.ts`) is an original radial/fan algorithm, not a
  copy of parlament.ch's design.
- Party colors are fetched live from the API's own `ParlGroup.ParlGroupColour`
  field (falling back to a neutral gray for any group without one assigned).

See `src/lib/api/` for the data layer and `src/lib/highlight/buildHighlightSet.ts`
for the core join/merge logic that turns a list of affair numbers into
per-seat highlights.

## Data source & attribution

Data: **Parlamentsdienste der Bundesversammlung, Bern** (Swiss Parliamentary
Services), via the official Open Data web services. This site is an
unofficial, independent visualization and is not a publication of the
Federal Assembly.

## Developing

```sh
npm install
npm run dev -- --open
```

## Testing

```sh
npm run test:unit    # Vitest — unit tests for the data-join, parsing, and
                      # layout logic, with the network mocked
npm run test:e2e      # Playwright — end-to-end flows, with ws.parlament.ch
                      # mocked via fixtures recorded from the real API
npm run test          # both
```

E2E fixtures live under `e2e/fixtures/odata/` and are recorded from the
live API by the dev-only `scripts/record-fixtures.ts` script — re-run it
(`npx tsx scripts/record-fixtures.ts`) if the fixtures need refreshing.

## Building & deployment

```sh
npm run build
npm run preview
```

The production build is a fully static site (`@sveltejs/adapter-static`),
published to the `gh-pages` branch via `.github/workflows/deploy.yml` on
every push to `main` (GitHub Pages is configured to deploy from that
branch). `.github/workflows/ci.yml` runs typecheck, lint, unit, and e2e
tests on every push and pull request.

The custom domain is configured via `static/CNAME`. To point a domain at
this site, add a `CNAME` DNS record for the subdomain to
`<owner>.github.io.`, then enable "Enforce HTTPS" in the repository's
Pages settings once DNS has propagated.

### PR previews

Every pull request gets its own live preview, deployed to
`/pr-preview/pr-<number>/` on the same `gh-pages` branch by
`.github/workflows/pr-preview.yml` (via
[`rossjrw/pr-preview-action`](https://github.com/rossjrw/pr-preview-action)),
with a link posted as a PR comment and updated on every push. The preview
build is a separate `npm run build` with `BASE_PATH=/pr-preview/pr-<number>`
so internal links resolve correctly at that subpath (see `vite.config.ts`).
Previews are removed automatically when the PR is closed.

## License

[Apache License 2.0](./LICENSE).
