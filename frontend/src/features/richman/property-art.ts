import type { PropertyDefinition, PropertyState } from './game/economy';
import type { Manifest } from './types';

/** Display metadata stays out of the game catalog and replay fingerprints. */
export function propertyAppearance(definition: PropertyDefinition, manifest: Manifest): PropertyDefinition {
  return { ...definition, direction: manifest.map.propertyDirections?.[definition.id] ?? definition.direction };
}

export function propertySprite(property: PropertyState, definition: PropertyDefinition): string | null {
  if (property.level === 0) return null;
  const frame = (8 - definition.direction) & 7;
  if (definition.kind === 'facility') return `facility-${property.buildingType ?? 0}-${property.level}-${frame}`;
  return property.buildingType === 1 ? `chain-${frame}` : `house-${property.level}-${frame}`;
}

export function requiredPropertySprites(): string[] {
  const prefixes = [
    ...Array.from({ length: 5 }, (_, i) => `house-${i + 1}`), 'chain',
    ...[1, 5, 5, 1, 5].flatMap((levels, type) => Array.from({ length: levels }, (_, i) => `facility-${type}-${i + 1}`)),
  ];
  return prefixes.flatMap(prefix => Array.from({ length: 8 }, (_, direction) => `${prefix}-${direction}`));
}

export function validMapArt(manifest: Manifest): boolean {
  const tiles = manifest.map.roadTiles;
  return manifest.mapArtVersion === 1 && manifest.propertyArtVersion === 2 && !!tiles && tiles.length === 43 &&
    new Set(tiles.map(tile => tile.nodeId)).size === tiles.length && tiles.every(tile => {
      const node = manifest.map.nodes.find(node => node.id === tile.nodeId);
      return node?.x === tile.x && node.y === tile.y && !!manifest.sprites[tile.sprite];
    }) && manifest.map.scenery.length === 22 && manifest.map.scenery.every(item => !!manifest.sprites[item.sprite]) &&
    requiredPropertySprites().every(key => !!manifest.sprites[key]);
}
