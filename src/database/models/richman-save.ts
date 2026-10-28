import { DataTypes, Model } from 'sequelize';
import type { InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize';
import type { SaveSummary, SlotKey } from '../../modules/richman/save-contract';

export class RichmanSaveSlot extends Model<InferAttributes<RichmanSaveSlot>, InferCreationAttributes<RichmanSaveSlot>> {
  declare ownerId: string;
  declare slotKey: SlotKey;
  declare slotVersion: number;
  declare currentRevisionId: string;
}
export class RichmanSaveRevision extends Model<InferAttributes<RichmanSaveRevision>, InferCreationAttributes<RichmanSaveRevision>> {
  declare id: string;
  declare ownerId: string;
  declare slotKey: SlotKey;
  declare slotVersion: number;
  declare requestId: string;
  declare requestHash: string;
  declare payload: string;
  declare bytes: number;
  declare summary: SaveSummary;
  declare createdAt: Date;
}

export function initRichmanSaveModels(sequelize: Sequelize) {
  RichmanSaveSlot.init({
    ownerId: { type: DataTypes.CHAR(36), primaryKey: true, field: 'owner_id' },
    slotKey: { type: DataTypes.STRING(16), primaryKey: true, field: 'slot_key' },
    slotVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'slot_version' },
    currentRevisionId: { type: DataTypes.CHAR(36), allowNull: false, field: 'current_revision_id' },
  }, { sequelize, tableName: 'richman_save_slots', timestamps: false });
  RichmanSaveRevision.init({
    id: { type: DataTypes.CHAR(36), primaryKey: true },
    ownerId: { type: DataTypes.CHAR(36), allowNull: false, field: 'owner_id' },
    slotKey: { type: DataTypes.STRING(16), allowNull: false, field: 'slot_key' },
    slotVersion: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, field: 'slot_version' },
    requestId: { type: DataTypes.STRING(64), allowNull: false, field: 'request_id' },
    requestHash: { type: DataTypes.CHAR(64), allowNull: false, field: 'request_hash' },
    payload: { type: DataTypes.TEXT('medium'), allowNull: false },
    bytes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    summary: { type: DataTypes.JSON, allowNull: false },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, field: 'created_at' },
  }, { sequelize, tableName: 'richman_save_revisions', timestamps: false });
}
