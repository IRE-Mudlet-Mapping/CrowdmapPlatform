# Crowdmap plugins

Plugins are owned by the game repository that needs them. The platform owns
the manifest contract and invokes plugins during trusted workflows; it does
not contain game-specific integrations, credentials, or rules.

Add each plugin directory to the root `crowdmap.json`:

```json
{
  "plugins": [
    { "path": "crowdmap/plugins/achaea-denizens" }
  ]
}
```

Every plugin contains a `crowdmap-plugin.json` manifest. The complete manifest
contract is published as [`crowdmap-plugin.schema.json`](../crowdmap-plugin.schema.json).
Only these fields are supported:

- `id`: a repository-unique lowercase identifier;
- `hooks`: zero or more lifecycle commands;
- `dangerRules`: an optional repository-relative Danger extension module.

Hook commands are non-empty arrays, so arguments are passed without shell
parsing:

```json
{
  "id": "achaea-denizens",
  "hooks": {
    "after-export": ["node", "update.mjs"],
    "before-publish": ["node", "validate.mjs"],
    "after-publish": ["node", "report.mjs"]
  }
}
```

The publish workflow invokes hooks in this order:

1. `after-export`, after the platform has generated `Map/*.json`;
2. `before-publish`, after the explorer and map files have been assembled;
3. `after-publish`, after the deployment action has completed.

Each command runs in its plugin directory. `CROWDMAP_ROOT` contains the game
repository path. Publication hooks also receive `CROWDMAP_PUBLISH_DIR`, the
configured website staging directory. Plugins document their own environment
variables and GitHub secrets; secrets are supplied by the game workflow or
repository and are intentionally not declared in the manifest.

## Dependencies and tests

A game that only uses platform behavior needs no `package.json`. If one or
more game plugins need Node dependencies or development tooling, declare them
once in the game repository's root `package.json` and commit the root
`package-lock.json`. The platform installs that root package for relevant
workflows and runs root `test` and `typecheck` scripts during dependency
validation.

Plugin-local package files remain supported for independently packaged
plugins, but the consolidated root package is recommended for ordinary game
repositories because it gives Dependabot only one dependency location.

## Danger rule extensions

Game-specific pull-request rules use `dangerRules`:

```json
{
  "id": "achaea-danger-rules",
  "hooks": {},
  "dangerRules": "danger-rules.ts"
}
```

The module exports objects implementing the shared `Rule` shape: a
`check(danger)` function. The platform generates static imports for declared
modules and evaluates them alongside the common rules.

Danger checks run from the trusted base checkout. A pull request supplies only
its candidate `Map/map`; it cannot replace the game-owned rule code that is
executed.
