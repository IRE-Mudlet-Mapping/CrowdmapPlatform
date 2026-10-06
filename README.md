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

The platform-owned explorer uses the maintained
[`mudlet-map-browser-script`](https://github.com/Delwing/mudlet-map-browser-script)
bundle and consumes `mapExport.json` and `colors.json`. The bundle version is
locked and updated centrally through Dependabot. Its native `MAP_CONFIG` uses
the canonical `game.title` plus optional `explorer.logo`, `explorer.theme`,
`explorer.credits`, and `explorer.npcUrl`. Game repositories do not carry web
assets, and omit `explorer` when no explorer-specific settings are needed.
Game-specific steps,
including Achaea's denizen database publication, use game-owned plugins rather
than being embedded in the common pipeline.

Game-owned Danger rules install their base rule types and map loader from the
public `@ire-mudlet-mapping/crowdmap-danger` npm package. This keeps the rule
definitions game-owned while using the same released framework in shared CI
and local plugin tests without a platform checkout or filesystem link.

## Status

This repository establishes the export contract, map scripts, shared Danger
policy, JSON and visual diff workflows, publishing workflow, explorer assets,
dependency validation, and Dependabot auto-merge workflow.

## Consumer configuration

Each game repository will add `crowdmap.json`:

```json
{
  "game": { "id": "imperian", "title": "The Imperian Map" },
  "map": { "source": "Map/map" },
  "plugins": [],
  "explorer": {
    "theme": "dark",
    "logo": "https://example.com/imperian-logo.svg",
    "credits": {
      "author": "IRE Mudlet Mapping contributors",
      "githubUrl": "https://github.com/IRE-Mudlet-Mapping/ImperianCrowdmap"
    }
  }
}
```

The configuration schema is available in
[`crowdmap.schema.json`](crowdmap.schema.json). Game plugin manifests use
[`crowdmap-plugin.schema.json`](crowdmap-plugin.schema.json). Both contracts
are enforced by the workflow runtime rather than serving as editor hints only.
See [`plugins/README.md`](plugins/README.md) for the game-owned plugin contract.

## Releases

Publication is restricted to `development`, including manual dispatches.
JSON diffs use the trusted base configuration and overlay only the pull request's
binary map, so forks and branches created before migration do not need their
own `crowdmap.json`. Generated exports use the same trusted configuration for
both revisions.

The reusable Dependabot auto-merge workflow approves validated Dependabot pull
requests targeting `development` before enabling squash auto-merge. Consumer
repositories must enable **Allow GitHub Actions to create and approve pull
requests** in their Actions settings, and enable auto-merge and squash merging.
Existing required reviews and status checks remain enforced.

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
immutable GitHub release, publishes the matching shared Danger SDK version to
npm, and advances `v1` for compatible major-1 releases.

The [Conventional commits workflow](.github/workflows/conventional-commits.yml)
checks every pull request title and commit. This is deliberate: PR titles become
squash-merge commit messages, and Release Please derives release notes and
versions from the resulting commit history.
