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

The explorer consumes `mapExport.json` and `colors.json`. Achaea alone may
enable NPC database publication through its game configuration.

## Status

This initial repository establishes the export contract and a reusable export
workflow. Validation, normalized diff comments, publishing, and explorer
integration will be migrated here before any game repository stops carrying
its current implementation.

## Consumer configuration

Each game repository will add `crowdmap.json`:

```json
{
  "game": { "id": "imperian", "title": "The Imperian Map" },
  "map": { "source": "Map/map" },
  "explorer": { "title": "The Imperian Map" }
}
```

The schema is available in [`crowdmap.schema.json`](crowdmap.schema.json).
