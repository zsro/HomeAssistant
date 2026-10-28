export type RoomSeat = { position: number; characterId: string; kind: 'human' | 'ai' | 'open' | 'closed'; ready: boolean; self: boolean; owner: boolean; name: string; online: boolean };
export type RoomView = { id: string; code: string; revision: number; status: string; initialFunds: number; gameId: string | null; owner: boolean; seats: RoomSeat[] };
export type RoomChange = { type: 'ready'; ready: boolean } | { type: 'character'; characterId: string } |
  { type: 'seat'; position: number; kind: 'open' | 'closed' | 'ai' } | { type: 'funds'; initialFunds: number } | { type: 'leave' };
