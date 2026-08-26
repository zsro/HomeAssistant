import { randomInt } from 'node:crypto';

const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateInviteCode(): string {
  let code = '';
  for (let index = 0; index < 10; index += 1) {
    code += alphabet[randomInt(alphabet.length)];
  }
  return code;
}
