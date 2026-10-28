export type MapNode = { id: number; x: number; y: number; adjacent: number[]; kind: number; name: string };
export type Frame = { x: number; y: number; width: number; height: number; anchorX: number; anchorY: number };
export type CharacterPose = { idle: string[]; walk: string[]; walkFramesPerDirection: number };
export type PresentationMode = 'motorcycle' | 'car' | 'engineer' | 'dream' | 'winter' | 'hospital' | 'prison';
export type Character = CharacterPose & { id: string; name: string; color: string; poses?: Partial<Record<PresentationMode, CharacterPose>> };
export type Manifest = {
  version: number;
  propertyArtVersion?: number;
  mapArtVersion?: number;
  presentationArtVersion?: number;
  sourceHashes?: Record<string, string>;
  map: {
    name: string; width: number; height: number; nodes: MapNode[];
    scenery: { x: number; y: number; sprite: string; name: string }[];
    roadTiles?: { nodeId: number; x: number; y: number; sprite: string }[];
    propertyDirections?: Record<string, number>;
  };
  characters: Character[];
  sprites: Record<string, Frame>;
};
export type Actor = { node: number; previous: number | null; x: number; y: number; direction: number };
export type Phase = 'surrender' | 'minigame' | 'facility' | 'magic' | 'idle' | 'rolling' | 'moving' | 'choosing' | 'property' | 'bank' | 'debt' | 'finished' | 'turnEnd' | 'shop' | 'effect' | 'reaction' | 'auction' | 'news' | 'fortune' | 'lottery' | 'commerce' | 'company';
export type Snapshot = {
  active: number; actors: Actor[]; phase: Phase; paused: boolean;
  dice: number; remaining: number; choices: number[]; completed: number; message: string;
};
