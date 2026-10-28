import nodes from './japan-topology.fixture.json';
import type { Manifest } from './types';
export const CHARACTER_IDS = ['xiaomei', 'tuu', 'chyan', 'salonbus'] as const;
/** Server-controlled rules content; never replaced by a client-supplied map or asset manifest. */
export const SERVER_MANIFEST: Manifest = {
  version: 1, map: { name: '日本', width: 2304, height: 2304, nodes, scenery: [] }, sprites: {},
  characters: CHARACTER_IDS.map(id => ({ id, name: id, color: '#fff', idle: [], walk: [], walkFramesPerDirection: 10 })),
};
