import { DataTypes, Model } from 'sequelize';
import type { InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize';
export class RichmanRoom extends Model<InferAttributes<RichmanRoom>, InferCreationAttributes<RichmanRoom>> {
  declare id: string; declare code: string; declare ownerId: string; declare revision: number; declare status: string;
  declare initialFunds: number; declare gameId: string | null; declare createdAt: Date; declare updatedAt: Date;
}
export class RichmanRoomSeat extends Model<InferAttributes<RichmanRoomSeat>, InferCreationAttributes<RichmanRoomSeat>> {
  declare roomId: string; declare position: number; declare userId: string | null; declare characterId: string;
  declare kind: 'human' | 'ai' | 'open' | 'closed'; declare ready: boolean; declare seenAt: Date;
}
export function initRichmanRoomModels(sequelize: Sequelize) {
  RichmanRoom.init({
    id: { type: DataTypes.CHAR(36), primaryKey: true }, code: { type: DataTypes.STRING(12), allowNull: false },
    ownerId: { type: DataTypes.CHAR(36), field: 'owner_id', allowNull: false }, revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false }, initialFunds: { type: DataTypes.INTEGER.UNSIGNED, field: 'initial_funds', allowNull: false },
    gameId: { type: DataTypes.CHAR(36), field: 'game_id', allowNull: true },
    createdAt: { type: DataTypes.DATE(3), field: 'created_at', allowNull: false }, updatedAt: { type: DataTypes.DATE(3), field: 'updated_at', allowNull: false },
  }, { sequelize, tableName: 'richman_rooms', timestamps: false });
  RichmanRoomSeat.init({
    roomId: { type: DataTypes.CHAR(36), field: 'room_id', primaryKey: true }, position: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    userId: { type: DataTypes.CHAR(36), field: 'user_id', allowNull: true }, characterId: { type: DataTypes.STRING(32), field: 'character_id', allowNull: false },
    kind: { type: DataTypes.STRING(16), allowNull: false }, ready: { type: DataTypes.BOOLEAN, allowNull: false },
    seenAt: { type: DataTypes.DATE(3), field: 'seen_at', allowNull: false },
  }, { sequelize, tableName: 'richman_room_seats', timestamps: false });
}
