# Crowdmap Platform

Shared build tooling and GitHub Actions workflows for the IRE Mudlet crowdmaps.

## Scope

The platform owns the common pipeline for every game:

```text
Map/map -> validate -> JSON exports -> normalized diff -> publish -> explorer
```

The canonical exports are `Map/map.json` (readable), `Map/map_mini.json`
(minified), `Map/mapExport.json`, and `Map/colors.json`. The original binary
map remains `Map/map`; no duplicate `map.dat` is published.

The explorer consumes `mapExport.json` and `colors.json`. Game-specific steps,
including Achaea's denizen database publication, use game-owned plugins rather
than being embedded in the common pipeline.

## Status

This initial repository establishes the export contract, map scripts, shared
Danger policy, JSON and visual diff workflows, publishing workflow, dependency
validation, and Dependabot auto-merge workflow. Explorer integration is the
remaining platform migration.

## Consumer configuration

Each game repository will add `crowdmap.json`:

```json
{
  "game": { "id": "imperian", "title": "The Imperian Map" },
  "map": { "source": "Map/map" },
  "plugins": [],
  "explorer": { "title": "The Imperian Map" }
}
```

The schema is available in [`crowdmap.schema.json`](crowdmap.schema.json).
See [`plugins/README.md`](plugins/README.md) for the game-owned plugin contract.

## Releases

Game repositories call reusable workflows at `@v1`. Each called workflow also
checks out the platform scripts at `v1`, so the workflow definition and the
executed implementation always come from the same compatibility line.

Platform dependency updates are validated and released as immutable `v1.x.y`
tags. After release validation, the maintained `v1` compatibility tag advances
to the latest compatible release. A game repository only needs a workflow
change for a breaking `@v2` upgrade.

[Release Please](.github/workflows/release-please.yml) manages this process on
`development`. Use Conventional Commits for platform changes; it opens a
release PR with the version and changelog update. Merging that PR creates the
immutable GitHub release and advances `v1` for compatible major-1 releases.
