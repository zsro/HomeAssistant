import type { Frame } from './types';

export type Point = { x: number; y: number };
export type PixelMask = { width: number; height: number; alpha: Uint8Array };
export type PickLayer = { target: string | null; x: number; y: number } & (
  | { kind: 'sprite'; frame: Frame }
  | { kind: 'land' }
);

/** Use the Web atlas's displayed transparency, not the unverified original index-mask mapping. */
export function atlasMask(width: number, height: number, rgba: Uint8ClampedArray): PixelMask {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0 || rgba.length !== width * height * 4) throw new Error('图集像素尺寸不匹配');
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return { width, height, alpha };
}

export function spriteContains(point: Point, layer: Extract<PickLayer, { kind: 'sprite' }>, mask: PixelMask): boolean {
  const f = layer.frame;
  const x = Math.floor(point.x - layer.x + f.anchorX), y = Math.floor(point.y - layer.y + f.anchorY);
  if (x < 0 || y < 0 || x >= f.width || y >= f.height) return false;
  const ax = f.x + x, ay = f.y + y;
  return ax >= 0 && ay >= 0 && ax < mask.width && ay < mask.height && mask.alpha[ay * mask.width + ax] > 0;
}

/** Layers are supplied in actual draw order. An opaque non-target blocks, it is not skipped. */
export function pickMapTarget(point: Point, layers: readonly PickLayer[], mask: PixelMask, candidates: readonly string[]): string | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  for (let i = layers.length - 1; i >= 0; i--) {
    const layer = layers[i];
    const hit = layer.kind === 'sprite' ? spriteContains(point, layer, mask)
      : Math.abs(point.x - layer.x) / 28 + Math.abs(point.y - layer.y) / 14 <= 1;
    if (hit) return layer.target !== null && candidates.includes(layer.target) ? layer.target : null;
  }
  return null;
}

/** Pointer capture can release outside the canvas. CSS sizing and renderer resolution are separate. */
export function pointerToWorld(client: Point, rect: { left: number; top: number; width: number; height: number },
  screen: { width: number; height: number }, world: Point & { zoom: number }): Point | null {
  if (![client.x, client.y, rect.left, rect.top, rect.width, rect.height, screen.width, screen.height, world.x, world.y, world.zoom].every(Number.isFinite)
    || rect.width <= 0 || rect.height <= 0 || screen.width <= 0 || screen.height <= 0 || world.zoom <= 0) return null;
  const x = client.x - rect.left, y = client.y - rect.top;
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
  return { x: (x * screen.width / rect.width - world.x) / world.zoom,
    y: (y * screen.height / rect.height - world.y) / world.zoom };
}
