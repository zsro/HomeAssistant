const security = [{ bearerAuth: [] }];
const parameters = [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }];
const errors = {
  '400': { description: 'VALIDATION_ERROR / NET_INVALID_COMMAND / NET_INTERNAL_COMMAND：拒绝未知字段、客户端计时、动画完成与暂停命令' },
  '401': { description: 'ACCESS_TOKEN_INVALID：账号失效或登录过期；写事务再次校验' },
  '404': { description: 'NET_NOT_FOUND：仅参与者可读写；不暴露他人对局' },
  '409': { description: 'NET_STALE / NET_REQUEST_REUSED / NET_WRONG_PLAYER / NET_ILLEGAL_ACTION：刷新状态后操作，不能改变原请求重试' },
  '413': { description: 'PAYLOAD_TOO_LARGE：请求 JSON 上限 4 KiB' },
  '429': { description: 'NET_INPUT_RATE / NET_RATE_LIMITED：小游戏点选间隔至少 50 ms；每账号每分钟最多 1800 个游戏 API 请求' },
  '503': { description: 'NET_HOST_UNAVAILABLE / NET_BUSY / NET_STORAGE_FAILED / NET_CHECKPOINT_INVALID / NET_GAME_STOPPED：保留请求编号及原载荷重试' },
};
export const gameOpenapiPaths = {
  '/v1/richman/games/{id}': { parameters, get: {
    tags: ['Richman'], security, summary: '本人参与对局的安全投影；同时续期 15 秒在线状态',
    description: 'NET-01 没有公开创建对局接口。protocolVersion=1；只包含公开场面、本人库存/持仓和本人待应答内容，不包含 seed/RNG/牌序/检查点/内部事件。房间与推送由 NET-02 接入。',
    responses: { '200': { description: 'success/data：gameId、revision、self、phase、players、properties、private、decision、hostError' }, ...errors },
  } },
  '/v1/richman/games/{id}/commands': { parameters, post: {
    tags: ['Richman'], security, summary: '提交本人游戏意图，事务提交后返回持久回执',
    description: '客户端不提交 playerId。重试必须复用 id、expectedRevision、action。一般操作要求精确 revision；同一 playing 小游戏的 point/dig/quit 允许落后最多 40 个 revision，不能跨 decisionId，不接受未来版本。响应不包含内部事件，随后 GET 最新投影。',
    requestBody: { required: true, content: { 'application/json': { schema: {
      type: 'object', additionalProperties: false, required: ['id', 'expectedRevision', 'action'],
      properties: { id: { type: 'string', pattern: '^[A-Za-z0-9_-]{1,64}$' },
        expectedRevision: { type: 'integer', minimum: 0 }, action: { type: 'object', description: '现有外部 Action 严格字段白名单；禁用 animationDone、pause、minigame.tick' } },
    } } } },
    responses: { '200': { description: 'success/data：id、gameId、revision、acceptedAt；重复请求返回原回执' }, ...errors },
  } },
  '/v1/richman/games/{id}/disconnect': { parameters, post: {
    tags: ['Richman'], security, summary: '结束本人当前对局的在线租期',
    responses: { '200': { description: '在线标记已移除；离线真人应答和小游戏计时等待重新连接' }, ...errors },
  } },
} as const;
