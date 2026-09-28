export type MapNode = { id: number; x: number; y: number; adjacent: number[]; kind: number; name: string };
export type Frame = { x: number; y: number; width: number; height: number; anchorX: number; anchorY: number };
export type Character = { id: string; name: string; color: string; idle: string[]; walk: string[]; walkFramesPerDirection: number };
export type Manifest = {
  version: number;
  map: {
    name: string; width: number; height: number; nodes: MapNode[];
    scenery: { x: number; y: number; sprite: string; name: string }[];
  };
  characters: Character[];
  sprites: Record<string, Frame>;
};
export type Actor = { node: number; previous: number | null; x: number; y: number; direction: number };
export type Phase = 'idle' | 'rolling' | 'moving' | 'choosing';
export type Snapshot = {
  active: number; actors: Actor[]; phase: Phase; paused: boolean;
  dice: number; remaining: number; choices: number[]; completed: number; message: string;
};
