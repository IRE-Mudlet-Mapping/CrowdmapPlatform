# Crowdmap Danger

Shared Danger rule primitives and Mudlet map loading for game-owned Crowdmap
rules. This package is released from
[CrowdmapPlatform](https://github.com/IRE-Mudlet-Mapping/CrowdmapPlatform) and
is intended for the IRE Mudlet Mapping game repositories.

```ts
import { RoomCheckRule } from "@ire-mudlet-mapping/crowdmap-danger/Rule";
import mapModel from "@ire-mudlet-mapping/crowdmap-danger/MapModel";
```

Games with custom rules can run those rules locally without maintaining a
Danger wrapper or Dangerfile:

```json
{
  "scripts": {
    "danger:local": "crowdmap-danger local"
  }
}
```

Run the command from the plugin directory. It discovers the nearest
`crowdmap-plugin.json` and repository `crowdmap.json`, then runs the module
declared by the plugin's `dangerRules` field against `origin/development`.
Use `crowdmap-danger local --base <ref>` to select another base revision.

This command intentionally runs only the game-owned extension rules. Common
rules remain platform-owned and are composed with extensions by the reusable
CI workflow. Games without custom rules do not need this package or a
`package.json`.
