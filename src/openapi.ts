export const openapiDocument = {
  openapi: '3.1.0',
  info: { title: 'HomeAssistant Invitation Auth API', version: '2.0.0' },
  servers: [{ url: '/api' }],
  tags: [{ name: 'System' }, { name: 'Auth' }, { name: 'Users' }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      User: {
        type: 'object',
        required: ['id', 'username', 'displayName', 'inviteCode', 'status', 'createdAt'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          displayName: { type: 'string' },
          inviteCode: { type: 'string', minLength: 10, maxLength: 10 },
          invitedByUserId: { type: ['string', 'null'], format: 'uuid' },
          status: { type: 'string', enum: ['active', 'disabled'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Tokens: {
        type: 'object',
        properties: {
          accessToken: { type: 'string' },
          refreshToken: { type: 'string' },
          tokenType: { type: 'string', const: 'Bearer' },
          accessExpiresIn: { type: 'integer', const: 900 },
          refreshExpiresIn: { type: 'integer', const: 2592000 },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', const: false },
          error: {
            type: 'object',
            properties: { code: { type: 'string' }, message: { type: 'string' }, details: {} },
          },
        },
      },
    },
  },
  paths: {
    '/health': { get: { tags: ['System'], summary: '进程健康检查', responses: { '200': { description: 'Healthy' } } } },
    '/ready': { get: { tags: ['System'], summary: '数据库及迁移就绪检查', responses: { '200': { description: 'Ready' }, '503': { description: 'Not ready' } } } },
    '/v1/auth/register': {
      post: {
        tags: ['Auth'], summary: '使用邀请码注册',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['username', 'password', 'displayName', 'inviteCode'], properties: { username: { type: 'string' }, password: { type: 'string', format: 'password' }, displayName: { type: 'string' }, inviteCode: { type: 'string' } } } } } },
        responses: { '201': { description: 'Registered' }, '400': { description: 'Invalid invitation or input' }, '409': { description: 'Username taken' } },
      },
    },
    '/v1/auth/login': {
      post: { tags: ['Auth'], summary: '登录', responses: { '200': { description: 'Logged in' }, '401': { description: 'Invalid credentials' } } },
    },
    '/v1/auth/refresh': {
      post: { tags: ['Auth'], summary: '刷新并轮换令牌', responses: { '200': { description: 'Rotated' }, '401': { description: 'Invalid refresh token' } } },
    },
    '/v1/auth/logout': {
      post: { tags: ['Auth'], summary: '退出当前刷新会话', responses: { '200': { description: 'Logged out' } } },
    },
    '/v1/auth/logout-all': {
      post: { tags: ['Auth'], summary: '退出全部设备', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Logged out all' } } },
    },
    '/v1/auth/password': {
      put: { tags: ['Auth'], summary: '修改密码', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Changed' }, '401': { description: 'Invalid old password' } } },
    },
    '/v1/users/me': {
      get: { tags: ['Users'], summary: '当前用户', security: [{ bearerAuth: [] }], responses: { '200': { description: 'Current user' } } },
    },
  },
} as const;
