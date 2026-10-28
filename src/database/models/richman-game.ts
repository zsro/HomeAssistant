import { DataTypes, Model } from 'sequelize';
import type { CreationOptional, InferAttributes, InferCreationAttributes, Sequelize } from 'sequelize';
import type { Command, GameEvent } from '../../../shared/richman/game/engine';
import type { ComputerPolicy } from '../../../shared/richman/game/computer';
export type CommandReceipt = { id: string; gameId: string; revision: number; acceptedAt: string };
export class RichmanGame extends Model<InferAttributes<RichmanGame>, InferCreationAttributes<RichmanGame>> {
  declare id: string; declare revision: number; declare status: string;
  declare checkpoint: string; declare checkpointHash: string; declare createdAt: Date; declare updatedAt: Date;
}
export class RichmanGameSeat extends Model<InferAttributes<RichmanGameSeat>, InferCreationAttributes<RichmanGameSeat>> {
  declare gameId: string; declare playerId: string; declare userId: string | null;
  declare controllerId: CreationOptional<string | null>; declare characterId: string; declare policy: ComputerPolicy | null;
}
export class RichmanGameCommand extends Model<InferAttributes<RichmanGameCommand>, InferCreationAttributes<RichmanGameCommand>> {
  declare gameId: string; declare revision: number; declare userId: string | null; declare requestId: string | null;
  declare requestHash: string | null; declare command: Command; declare events: GameEvent[];
  declare receipt: CommandReceipt | null; declare createdAt: Date;
}
export function initRichmanGameModels(sequelize: Sequelize) {
  RichmanGame.init({
    id: { type: DataTypes.CHAR(36), primaryKey: true }, revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.STRING(16), allowNull: false }, checkpoint: { type: DataTypes.TEXT('medium'), allowNull: false },
    checkpointHash: { type: DataTypes.CHAR(64), allowNull: false, field: 'checkpoint_hash' },
    createdAt: { type: DataTypes.DATE(3), allowNull: false, field: 'created_at' },
    updatedAt: { type: DataTypes.DATE(3), allowNull: false, field: 'updated_at' },
  }, { sequelize, tableName: 'richman_games', timestamps: false });
  RichmanGameSeat.init({
    controllerId: { type: DataTypes.CHAR(36), allowNull: true, field: 'controller_id' },
    gameId: { type: DataTypes.CHAR(36), primaryKey: true, field: 'game_id' },
    playerId: { type: DataTypes.STRING(16), primaryKey: true, field: 'player_id' },
    userId: { type: DataTypes.CHAR(36), allowNull: true, field: 'user_id' },
    characterId: { type: DataTypes.STRING(32), allowNull: false, field: 'character_id' },
    policy: { type: DataTypes.STRING(32), allowNull: true },
  }, { sequelize, tableName: 'richman_game_seats', timestamps: false });
  RichmanGameCommand.init({
    gameId: { type: DataTypes.CHAR(36), primaryKey: true, field: 'game_id' },
    revision: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    userId: { type: DataTypes.CHAR(36), allowNull: true, field: 'user_id' },
    requestId: { type: DataTypes.STRING(64), allowNull: true, field: 'request_id' },
    requestHash: { type: DataTypes.CHAR(64), allowNull: true, field: 'request_hash' },
    command: { type: DataTypes.JSON, allowNull: false }, events: { type: DataTypes.JSON, allowNull: false },
    receipt: { type: DataTypes.JSON, allowNull: true }, createdAt: { type: DataTypes.DATE(3), allowNull: false, field: 'created_at' },
  }, { sequelize, tableName: 'richman_game_commands', timestamps: false });
}
