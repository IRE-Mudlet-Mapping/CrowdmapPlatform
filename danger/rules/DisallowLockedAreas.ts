import type { MudletMap } from "mudlet-map-binary-reader";
import { readFile } from "node:fs/promises";
import { MapChangeRule } from "../classes/Rule.ts";

export function createDisallowLockedAreasRule(map: Pick<MudletMap, "areaNames" | "areas" | "rooms"> | null) {
  if (map === null) return new MapChangeRule(async () => true, "No map is available in the repository template.");
  const locked = Object.entries(map.areas)
    .filter(([, area]) => area.rooms.length > 0 && area.rooms.every((id) => map.rooms[id].isLocked))
    .map(([id]) => map.areaNames[Number(id)]);
  return new MapChangeRule(
    async () => locked.length === 0,
    locked.length === 0 ? "All areas unlocked." : `Found the following locked areas: ${locked.toString()}`
  );
}

export const disallowLockedAreas = {
  async check(danger: Parameters<MapChangeRule["check"]>[0]) {
    if (!danger.git.fileMatch("Map/map").modified) return;
    const input = await readFile("Map/map");
    if (input.length === 0) {
      await createDisallowLockedAreasRule(null).check(danger);
      return;
    }
    const { MudletMapReader } = await import("mudlet-map-binary-reader");
    await createDisallowLockedAreasRule(MudletMapReader.readBuffer(input)).check(danger);
  },
};
