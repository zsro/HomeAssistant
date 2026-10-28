import { createHash, randomUUID } from 'node:crypto';
import { Op, Transaction } from 'sequelize';
import type { AppContext } from '../../app-context';
import type { RichmanSaveRevision } from '../../database/models/richman-save';
import { AppError } from '../../lib/app-error';
import type { SaveReceipt, SaveWrite, SlotKey } from './save-contract';
import type { SaveValidator } from './save-validator';

const metadataAttributes = ['id', 'ownerId', 'slotKey', 'slotVersion', 'requestHash', 'bytes', 'summary', 'createdAt'];
function receipt(row: RichmanSaveRevision): SaveReceipt {
  return { slot: row.slotKey, slotVersion: row.slotVersion, revisionId: row.id,
    savedAt: row.createdAt.toISOString(), bytes: row.bytes, summary: row.summary };
}
function retry(row: RichmanSaveRevision, hash: string): SaveReceipt {
  if (row.requestHash !== hash) throw new AppError(409, 'SAVE_REQUEST_REUSED', '同一 requestId 不能用于不同的保存请求');
  return receipt(row);
}
function conflict(version: number): never {
  throw new AppError(409, 'SAVE_VERSION_CONFLICT', '槽位已被其他请求更新，请重新读取', { currentSlotVersion: version });
}

export class SaveService {
  constructor(private readonly context: AppContext, private readonly validator: SaveValidator) {}

  async list(ownerId: string): Promise<SaveReceipt[]> {
    const { RichmanSaveSlot: Slot, RichmanSaveRevision: Revision } = this.context.models;
    const slots = await Slot.findAll({ where: { ownerId } });
    if (!slots.length) return [];
    // Read the immutable revisions selected by the first query: concurrent saves
    // may advance the pointer, but cannot mix an older version with newer data.
    const rows = await Revision.findAll({
      where: { ownerId, id: { [Op.in]: slots.map(slot => slot.currentRevisionId) } },
      attributes: metadataAttributes, order: [['slotKey', 'ASC']],
    });
    return rows.map(receipt);
  }

  async read(ownerId: string, slotKey: SlotKey) {
    const { RichmanSaveSlot: Slot, RichmanSaveRevision: Revision } = this.context.models;
    const slot = await Slot.findOne({ where: { ownerId, slotKey } });
    const row = slot ? await Revision.findOne({ where: { ownerId, slotKey, id: slot.currentRevisionId } }) : null;
    if (!row) throw new AppError(404, 'SAVE_NOT_FOUND', '此槽位没有存档');
    return { ...receipt(row), save: row.payload };
  }

  async write(ownerId: string, authVersion: number, slotKey: SlotKey, input: SaveWrite, signal?: AbortSignal): Promise<SaveReceipt> {
    const { sequelize, models: { User, RichmanSaveSlot: Slot, RichmanSaveRevision: Revision } } = this.context;
    // Hash exact submitted UTF-8 JSON and expected version. Clients must retain
    // both on timeout retries; formatting changes require a new requestId.
    const hash = createHash('sha256').update(`${input.expectedSlotVersion}\n`).update(input.save).digest('hex');
    const key = { ownerId, slotKey, requestId: input.requestId };
    const previous = await Revision.findOne({ where: key, attributes: metadataAttributes });
    if (previous) return retry(previous, hash);
    const summary = await this.validator.validate(input.save, signal);
    if (signal?.aborted) throw new AppError(499, 'SAVE_CANCELLED', '保存请求已取消');

    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction => {
      // A pre-existing owner row serializes first creation as well as overwrites.
      // Do not hold any database lock while replaying game commands.
      const user = await User.findByPk(ownerId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!user || user.status !== 'active' || user.authVersion !== authVersion) {
        throw new AppError(401, 'ACCESS_TOKEN_INVALID', '访问令牌无效或已过期');
      }
      const repeated = await Revision.findOne({ where: key, attributes: metadataAttributes, transaction });
      if (repeated) return retry(repeated, hash);
      const slot = await Slot.findOne({ where: { ownerId, slotKey }, transaction, lock: transaction.LOCK.UPDATE });
      const version = slot?.slotVersion ?? 0;
      if (version !== input.expectedSlotVersion) conflict(version);
      if (version >= 4_294_967_295) throw new AppError(409, 'SAVE_VERSION_EXHAUSTED', '槽位版本已达上限');
      const row = await Revision.create({
        id: randomUUID(), ownerId, slotKey, slotVersion: version + 1, requestId: input.requestId,
        requestHash: hash, payload: input.save, bytes: Buffer.byteLength(input.save), summary, createdAt: new Date(),
      }, { transaction });
      if (slot) {
        const [updated] = await Slot.update({ currentRevisionId: row.id, slotVersion: version + 1 }, {
          where: { ownerId, slotKey, slotVersion: version }, transaction,
        });
        if (updated !== 1) conflict(version);
      } else {
        await Slot.create({ ownerId, slotKey, slotVersion: 1, currentRevisionId: row.id }, { transaction });
      }
      return receipt(row);
    }).catch((error: unknown) => {
      if (error instanceof AppError) throw error;
      // Database errors can include SQL with the complete save payload. Do not
      // send it to HTTP responses or the generic error logger. A lost commit
      // acknowledgement is resolved by retrying the exact same requestId/body.
      throw new AppError(503, 'SAVE_STORAGE_FAILED', '保存结果暂时无法确认，请保留本次请求并重试');
    });
  }
}
