# Crowdmap plugins

Plugins are owned by their game repository. The platform owns only the hook
protocol and invokes a selected plugin during trusted publish runs. This keeps
game-specific integration code, dependencies, credentials, and release cadence
with the game that needs them.

Every game plugin declares in `crowdmap-plugin.json`:

- its lifecycle hook command array (`after-export`, `before-publish`, or
  `after-publish`);
- its own package/dependencies;
- required GitHub secrets; and
- a documented configuration object and tests.

For example, Achaea can own `crowdmap/plugins/denizens/`:

```json
// crowdmap.json
{ "plugins": [{ "path": "crowdmap/plugins/denizens" }] }
```

```json
// crowdmap/plugins/denizens/crowdmap-plugin.json
{ "id": "achaea-denizens", "hooks": { "after-export": ["node", "run.mjs"] } }
```

The reusable publish workflow resolves plugin paths beneath the caller
repository, installs only their declared packages, and invokes the requested
hook. Plugins never run as part of untrusted pull-request validation.
