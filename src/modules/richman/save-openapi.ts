import { SAVE_BYTES, SLOT_KEYS } from './save-contract';

const receipt = {
  type: 'object',
  required: ['slot', 'slotVersion', 'revisionId', 'savedAt', 'bytes', 'summary'],
  properties: {
    slot: { type: 'string', enum: SLOT_KEYS },
    slotVersion: { type: 'integer', minimum: 1 },
    revisionId: { type: 'string', format: 'uuid' },
    savedAt: { type: 'string', format: 'date-time' },
    bytes: { type: 'integer' },
    summary: {
      type: 'object',
      properties: {
        gameId: { type: 'string' }, revision: { type: 'integer' }, rulesId: { type: 'string' },
        mapId: { const: 'japan' }, characterIds: { type: 'array', items: { type: 'string' } },
        computerIds: { type: 'array', items: { type: 'string' } },
        gameDate: { type: ['string', 'null'] }, turn: { type: 'integer' },
        activePlayerId: { type: ['string', 'null'] }, paused: { type: 'boolean' },
        phase: { type: 'string' }, stateDigest: { type: 'string' },
      },
    },
  },
} as const;
const success = (data: object) => ({
  description: '成功；savedAt、slotVersion 由服务端生成',
  content: { 'application/json': { schema: { type: 'object', properties: { success: { const: true }, data } } } },
});
const errors = {
  '400': { description: 'VALIDATION_ERROR / INVALID_JSON：参数或 JSON 无效' },
  '401': { description: 'ACCESS_TOKEN_INVALID：登录过期或账号失效' },
  '404': { description: 'SAVE_NOT_FOUND：本人槽位为空；不透露其他账号存档' },
  '409': { description: 'SAVE_VERSION_CONFLICT（details.currentSlotVersion）/ SAVE_REQUEST_REUSED / SAVE_VERSION_EXHAUSTED' },
  '413': { description: 'SAVE_TOO_LARGE（存档 UTF-8 超过 8 MiB）/ PAYLOAD_TOO_LARGE（完整 HTTP JSON 超过 9 MiB）' },
  '415': { description: 'SAVE_CONTENT_TYPE / ENCODING_UNSUPPORTED / CHARSET_UNSUPPORTED：只接受未压缩 application/json' },
  '422': { description: 'SAVE_INVALID（details.reason 为恢复契约错误）/ SAVE_RESTORE_TIMEOUT：无法完整恢复' },
  '429': { description: 'SAVE_RATE_LIMITED：每账号每分钟最多 12 次 PUT' },
  '503': { description: 'SAVE_BUSY / SAVE_VALIDATOR_FAILED / SAVE_STORAGE_FAILED：保持相同 requestId 和原请求体稍后重试' },
} as const;

export const saveOpenapiPaths = {
  '/v1/richman/saves': {
    get: {
      tags: ['Richman'], security: [{ bearerAuth: [] }], summary: '本人已保存槽位的摘要列表，空槽位省略',
      responses: { '200': success({ type: 'object', properties: { saves: { type: 'array', items: receipt } } }), '401': errors['401'] },
    },
  },
  '/v1/richman/saves/{slot}': {
    parameters: [{ in: 'path', name: 'slot', required: true, schema: { type: 'string', enum: SLOT_KEYS } }],
    get: {
      tags: ['Richman'], security: [{ bearerAuth: [] }], summary: '读取本人槽位的当前成功版本',
      responses: { '200': success({ ...receipt, required: [...receipt.required, 'save'],
        properties: { ...receipt.properties, save: { type: 'string', description: '原始 SaveEnvelopeV1 JSON；客户端仍需完整恢复校验' } } }),
      '401': errors['401'], '404': errors['404'] },
    },
    put: {
      tags: ['Richman'], security: [{ bearerAuth: [] }], summary: '创建或覆盖本人槽位',
      description: '首次 expectedSlotVersion=0；覆盖用最新槽位版本。同一账号/槽位/requestId 的完全相同请求返回原回执，即使槽位已推进；save 字符串空白或 expectedSlotVersion 改动均视为不同请求。单机个人存档，不提供联机权威或防作弊。',
      requestBody: { required: true, content: { 'application/json': { schema: {
        type: 'object', additionalProperties: false, required: ['requestId', 'expectedSlotVersion', 'save'],
        properties: {
          requestId: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$', description: '建议 UUID，失败重试保留原值' },
          expectedSlotVersion: { type: 'integer', minimum: 0, maximum: 4_294_967_295 },
          save: { type: 'string', maxLength: SAVE_BYTES, description: 'SAVE-01 exportSave() 返回的 JSON 字符串；额外限制 UTF-8 字节数 <=8 MiB' },
        },
      } } } },
      responses: { '200': success(receipt), ...errors },
    },
  },
} as const;
