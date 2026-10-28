import { randomBytes } from 'node:crypto';
import { Op } from 'sequelize';
import type { Transaction } from 'sequelize';
import type { AppContext } from '../../app-context';
import { AppError } from '../../lib/app-error';
import { CHARACTER_IDS } from '../../../shared/richman/content';
import type { RoomChange, RoomView } from '../../../shared/richman/rooms';
import type { RichmanRoom, RichmanRoomSeat } from '../../database/models/richman-room';
const fail = (message: string, code = 'ROOM_CONFLICT') => new AppError(409, code, message);
const online = (seat: RichmanRoomSeat) => Date.now() - seat.seenAt.getTime() < 20_000;
export class RoomService {
  constructor(private readonly context: AppContext) {}
  private async authorize(userId: string, authVersion: number, transaction: Transaction) {
    const user = await this.context.models.User.findByPk(userId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!user || user.status !== 'active' || user.authVersion !== authVersion) throw new AppError(401, 'ACCESS_TOKEN_INVALID', '请重新登录');
  }
  private async locked(id: string, userId: string, transaction: Transaction) {
    const room = await this.context.models.RichmanRoom.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    const seats = await this.context.models.RichmanRoomSeat.findAll({ where: { roomId: id }, order: [['position', 'ASC']], transaction });
    const self = seats.find(s => s.userId === userId);
    if (!room || !self) throw new AppError(404, 'ROOM_NOT_FOUND', '找不到本人参加的房间');
    return { room, seats, self };
  }
  private async noWaitingRoom(userId: string, transaction: Transaction) {
    const seats = await this.context.models.RichmanRoomSeat.findAll({ where: { userId }, attributes: ['roomId'], transaction });
    if (seats.length && await this.context.models.RichmanRoom.count({ where: { id: { [Op.in]: seats.map(s => s.roomId) }, status: 'waiting' }, transaction })) {
      throw fail('请先返回或离开已有的待开局房间', 'ROOM_ALREADY_JOINED');
    }
  }
  async list(userId: string) {
    const seats = await this.context.models.RichmanRoomSeat.findAll({ where: { userId }, attributes: ['roomId'] });
    const rooms = await this.context.models.RichmanRoom.findAll({ where: { id: { [Op.in]: seats.map(s => s.roomId) }, status: { [Op.ne]: 'closed' } }, order: [['status', 'DESC'], ['updatedAt', 'DESC']], limit: 50 });
    return rooms.map(r => ({ id: r.id, code: r.code, status: r.status, gameId: r.gameId }));
  }
  async create(id: string, userId: string, authVersion: number) {
    await this.context.sequelize.transaction(async transaction => {
      await this.authorize(userId, authVersion, transaction);
      const previous = await this.context.models.RichmanRoom.findByPk(id, { transaction });
      if (previous) {
        if (previous.ownerId !== userId) throw fail('请求编号已使用');
        return;
      }
      await this.noWaitingRoom(userId, transaction);
      const now = new Date();
      await this.context.models.RichmanRoom.create({ id, code: randomBytes(6).toString('hex').toUpperCase(), ownerId: userId,
        revision: 0, status: 'waiting', initialFunds: 100000, gameId: null, createdAt: now, updatedAt: now }, { transaction });
      await this.context.models.RichmanRoomSeat.bulkCreate(CHARACTER_IDS.map((characterId, position) => ({
        roomId: id, position, characterId, userId: position === 0 ? userId : null, kind: position === 0 ? 'human' : position === 1 ? 'open' : 'closed', ready: false, seenAt: now,
      })), { transaction });
    });
    return this.view(id, userId);
  }
  async join(code: string, userId: string, authVersion: number) {
    const id = await this.context.sequelize.transaction(async transaction => {
      await this.authorize(userId, authVersion, transaction);
      const room = await this.context.models.RichmanRoom.findOne({ where: { code }, transaction, lock: transaction.LOCK.UPDATE });
      if (!room || room.status === 'closed') throw new AppError(404, 'ROOM_UNAVAILABLE', '房间码无效或房间已关闭');
      const seats = await this.context.models.RichmanRoomSeat.findAll({ where: { roomId: room.id }, order: [['position', 'ASC']], transaction });
      if (seats.some(s => s.userId === userId)) return room.id;
      if (room.status !== 'waiting') throw fail('本房间已经开局，不能加入');
      const seat = seats.find(s => s.kind === 'open');
      if (!seat) throw fail('房间已满，等待房主开放座位');
      await this.noWaitingRoom(userId, transaction);
      await seat.update({ userId, kind: 'human', seenAt: new Date() }, { transaction });
      await this.invalidate(room, transaction);
      return room.id;
    });
    return this.view(id, userId);
  }
  private async invalidate(room: RichmanRoom, transaction: Transaction) {
    await this.context.models.RichmanRoomSeat.update({ ready: false }, { where: { roomId: room.id }, transaction });
    await room.update({ revision: room.revision + 1, updatedAt: new Date() }, { transaction });
  }
  private async project(room: RichmanRoom, seats: RichmanRoomSeat[], userId: string, transaction: Transaction): Promise<RoomView> {
    const users = await this.context.models.User.findAll({ where: { id: { [Op.in]: seats.flatMap(s => s.userId ? [s.userId] : []) } }, attributes: ['id', 'displayName'], transaction });
    return { id: room.id, code: room.code, revision: room.revision, status: room.status, initialFunds: room.initialFunds, gameId: room.gameId, owner: room.ownerId === userId,
      seats: seats.map(s => ({ position: s.position, characterId: s.characterId, kind: s.kind, ready: s.ready, self: s.userId === userId,
        owner: s.userId === room.ownerId, name: users.find(u => u.id === s.userId)?.displayName ?? (s.kind === 'ai' ? '电脑' : '等待玩家'), online: s.kind === 'ai' || online(s) || !!(room.gameId && s.userId && this.context.gameHost?.isOnline(room.gameId, s.userId)) })) };
  }
  async view(id: string, userId: string) {
    return this.context.sequelize.transaction(async transaction => {
      const { room, seats, self } = await this.locked(id, userId, transaction);
      await self.update({ seenAt: new Date() }, { transaction });
      return this.project(room, seats, userId, transaction);
    });
  }
  async change(id: string, userId: string, authVersion: number, revision: number, action: RoomChange) {
    return this.context.sequelize.transaction(async transaction => {
      await this.authorize(userId, authVersion, transaction);
      const { room, seats, self } = await this.locked(id, userId, transaction);
      if (room.status !== 'waiting') throw fail('开局后座位和规则已冻结；关闭页面不会结束对局');
      if (room.revision !== revision) throw fail('房间已更新，请按最新状态操作', 'ROOM_STALE');
      if (action.type === 'ready') {
        await self.update({ ready: action.ready, seenAt: new Date() }, { transaction });
        await room.update({ revision: room.revision + 1 }, { transaction });
      } else {
        if (action.type === 'character') {
          const other = seats.find(s => s.characterId === action.characterId)!;
          if (!other) throw fail('未知角色');
          if (other.position !== self.position) {
            if (other.kind === 'human' || other.kind === 'ai') throw fail('角色已经被选择');
            // Unique constraint remains valid while swapping unoccupied character slots.
            const previous = self.characterId;
            await self.update({ characterId: '_swap' }, { transaction });
            await other.update({ characterId: previous }, { transaction });
            await self.update({ characterId: action.characterId }, { transaction });
          }
        } else if (action.type === 'leave') {
          await self.update({ userId: null, kind: 'open', ready: false }, { transaction });
          const humans = seats.filter(s => s.userId && s.position !== self.position);
          if (!humans.length) await room.update({ status: 'closed' }, { transaction });
          else if (room.ownerId === userId) await room.update({ ownerId: (humans.find(online) ?? humans[0]!).userId! }, { transaction });
        } else {
          if (room.ownerId !== userId) throw new AppError(403, 'ROOM_OWNER_ONLY', '只有房主可修改开局配置');
          if (action.type === 'funds') await room.update({ initialFunds: action.initialFunds }, { transaction });
          else {
            const target = seats.find(s => s.position === action.position);
            if (!target || target.kind === 'human') throw fail('不能替换已入座玩家');
            await target.update({ kind: action.kind }, { transaction });
          }
        }
        await this.invalidate(room, transaction);
      }
      return { changed: true };
    });
  }
  async start(id: string, userId: string, authVersion: number, revision: number) {
    const host = this.context.gameHost;
    if (!host?.available) throw new AppError(503, 'NET_HOST_UNAVAILABLE', '联机宿主暂不可用');
    return host.provision(async (transaction, create) => {
      await this.authorize(userId, authVersion, transaction);
      const { room, seats } = await this.locked(id, userId, transaction);
      if (room.ownerId !== userId) throw new AppError(403, 'ROOM_OWNER_ONLY', '只有房主可开始对局');
      if (room.gameId) return { gameId: room.gameId };
      if (room.status !== 'waiting' || room.revision !== revision) throw fail('房间已更新，请重新确认', 'ROOM_STALE');
      const occupied = seats.filter(s => s.kind === 'human' || s.kind === 'ai');
      if (occupied.length < 2 || seats.some(s => s.kind === 'open') || occupied.some(s => s.kind === 'human' && (!s.ready || !online(s)))) throw fail('需要至少两位玩家或电脑，关闭空位，并等待所有玩家在线准备');
      const gameId = await create(occupied.map((s, i) => ({ playerId: `player-${i + 1}`, userId: s.userId, characterId: s.characterId, policy: s.kind === 'ai' ? 'research-v1' : null })), room.initialFunds);
      await room.update({ gameId, status: 'playing', revision: room.revision + 1, updatedAt: new Date() }, { transaction });
      return { gameId };
    });
  }
}
