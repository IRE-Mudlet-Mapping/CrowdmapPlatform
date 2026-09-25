import { MapChangeRule } from "../classes/Rule.ts";
import mapModel from "../helpers/MapModel.ts";

type MapForLockedAreas = {
  areaNames: Record<number, string>;
  areas: Record<number, { rooms: number[] }>;
  rooms: Record<number, { isLocked: boolean }>;
};

export function createDisallowLockedAreasRule(map: MapForLockedAreas | null) {
  if (map === null) return new MapChangeRule(async () => true, "No map is available in the repository template.");
  const locked = Object.entries(map.areas)
    .filter(([, area]) => area.rooms.length > 0 && area.rooms.every((id) => map.rooms[id].isLocked))
    .map(([id]) => map.areaNames[Number(id)]);
  return new MapChangeRule(
    async () => locked.length === 0,
    locked.length === 0 ? "All areas unlocked." : `Found the following locked areas: ${locked.toString()}`
  );
}

export const disallowLockedAreas = createDisallowLockedAreasRule(mapModel);
