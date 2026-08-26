import { randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { z } from 'zod';
import { loadConfig } from '../src/config/env';
import { initModels } from '../src/database/models';
import { createSequelize } from '../src/database/sequelize';
import { generateInviteCode } from '../src/modules/auth/invite-code';
import { hashPassword } from '../src/modules/auth/password';
import { registerSchema } from '../src/modules/auth/validation';

const bootstrapSchema = z.object({
  BOOTSTRAP_USERNAME: z.string(),
  BOOTSTRAP_PASSWORD: z.string(),
  BOOTSTRAP_DISPLAY_NAME: z.string(),
});

async function main() {
  const config = loadConfig();
  const bootstrap = bootstrapSchema.parse(process.env);
  const input = registerSchema.omit({ inviteCode: true }).parse({
    username: bootstrap.BOOTSTRAP_USERNAME,
    password: bootstrap.BOOTSTRAP_PASSWORD,
    displayName: bootstrap.BOOTSTRAP_DISPLAY_NAME,
  });
  const sequelize = createSequelize(config);
  const models = initModels(sequelize);

  try {
    const user = await sequelize.transaction(
      { isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE },
      async (transaction) => {
        if (await models.User.count({ transaction })) {
          throw new Error('users 表不为空，首用户 CLI 已禁用');
        }

        for (let attempt = 0; attempt < 10; attempt += 1) {
          const inviteCode = generateInviteCode();
          if (await models.User.findOne({ where: { inviteCode }, transaction })) continue;
          return models.User.create({
            id: randomUUID(),
            username: input.username,
            passwordHash: await hashPassword(input.password),
            displayName: input.displayName,
            inviteCode,
            invitedByUserId: null,
            status: 'active',
            authVersion: 0,
            lastLoginAt: null,
          }, { transaction });
        }
        throw new Error('邀请码生成失败');
      },
    );

    console.log(JSON.stringify({ id: user.id, username: user.username, inviteCode: user.inviteCode }, null, 2));
  } finally {
    await sequelize.close();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
