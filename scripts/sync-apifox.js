const fs = require('fs');
const path = require('path');
const https = require('https');

const OUTPUT_PATH = path.resolve(__dirname, '../docs/openapi.json');
const APIFOX_API_VERSION = '2024-03-28';
const DEFAULT_PROJECT_ID = '8110356';

const userExample = {
  id: '1f98301d-f808-4a3d-9bd3-c4fa9fa8a3f0',
  username: 'parent01',
  name: '影子妈妈',
  role: 'mother',
  familyId: '4dd6bf7f-406f-4c51-98b2-6b4dfb6fa0c1',
  avatar: null,
};

const familyExample = {
  id: '4dd6bf7f-406f-4c51-98b2-6b4dfb6fa0c1',
  code: 'A8C2K9',
  name: '影子妈妈的家庭',
};

const memberExample = {
  id: userExample.id,
  name: userExample.name,
  role: userExample.role,
  avatar: null,
};

const displayDeviceExample = {
  id: '85fe2a37-bc78-4877-b6f5-936295d4abf17',
  familyId: familyExample.id,
  name: '客厅电视',
  status: 'active',
  lastSeenAt: '2026-04-14T13:20:00.000Z',
  currentScreenType: 'home',
};

const displayStateExample = {
  deviceId: displayDeviceExample.id,
  screenType: 'home',
  payload: {
    title: familyExample.name,
    subtitle: '影子妈妈 已完成连接',
    hint: '请在手机控制端切换要显示的内容',
  },
  version: 3,
  updatedAt: '2026-04-14T13:20:00.000Z',
};

const pinyinLessonExample = {
  id: 'py-01',
  title: '声调与四线格',
  durationMinutes: 10,
  tagline: '先认识拼音的“跑道”和“音高”。',
  focus: ['四线三格', '四个声调', '口型模仿'],
  goals: ['知道四线三格的基本位置', '能按顺序读出一声到四声'],
  teachingSteps: ['观察四线三格。', '跟读 a、á、ǎ、à。'],
  practiceWords: ['mā 妈', 'mǎ 马'],
  practiceSentence: '妈妈骑马。',
  miniTask: '边做手势边把四声读三遍。',
  checkpoints: ['能说出四线三格', '能辨认四个声调'],
};

const pinyinSummaryExample = {
  completedLessonIds: ['py-01', 'py-02'],
  completedLessons: 2,
  totalLessons: 36,
  completionRate: 6,
  currentLessonId: 'py-03',
  currentLesson: {
    ...pinyinLessonExample,
    id: 'py-03',
    title: '单韵母 i u ü 与 y w',
  },
  lastCompletedLessonId: 'py-02',
  updatedAt: '2026-04-14T13:00:00.000Z',
  totalMinutes: 360,
};

const registerRequestExample = {
  username: 'parent01',
  password: 'secret123',
  name: '影子妈妈',
  role: 'mother',
  familyCode: 'A8C2K9',
};

const displaySessionCreateExample = {
  installationId: 'display-installation-001',
};

const displaySessionResponseExample = {
  sessionId: '5abc86e1-8719-46ea-83c4-d9808295c373',
  isBound: false,
  pairCode: '123456',
  expiresAt: '2026-04-14T13:25:00.000Z',
  pairToken: 'pair-token-example',
};

const displayBoundSessionResponseExample = {
  sessionId: '5abc86e1-8719-46ea-83c4-d9808295c373',
  isBound: true,
  pairCode: '123456',
  expiresAt: '2026-04-14T13:25:00.000Z',
  device: displayDeviceExample,
  state: displayStateExample,
  displayToken: 'display-token-example',
};

function successEnvelopeSchema(dataSchema) {
  return {
    allOf: [
      { $ref: '#/components/schemas/SuccessEnvelope' },
      {
        type: 'object',
        properties: {
          data: dataSchema,
        },
      },
    ],
  };
}

function successResponse(description, dataSchema, example, message = '成功') {
  return {
    description,
    content: {
      'application/json': {
        schema: successEnvelopeSchema(dataSchema),
        example: {
          code: 0,
          msg: message,
          data: example,
        },
      },
    },
  };
}

function errorResponse(description, status, code, msg, extra) {
  const example = {
    code,
    msg,
    data: null,
  };

  if (extra !== undefined) {
    example.extra = extra;
  }

  return {
    description,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ErrorEnvelope' },
        example,
      },
    },
  };
}

function buildSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'HomeAssistant API',
      version: '1.0.0',
      description: [
        'HomeAssistant 当前服务端接口文档。',
        '说明：`/ws/display` 为 WebSocket 握手入口，其消息体约定以说明文字记录；其余路径为标准 HTTP JSON 接口。',
      ].join('\n'),
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: '本地开发环境',
      },
      {
        url: 'http://106.15.230.148',
        description: '线上生产环境',
      },
    ],
    tags: [
      { name: 'System', description: '系统健康检查' },
      { name: 'Auth', description: '用户认证与账户信息' },
      { name: 'Family', description: '家庭创建、加入与成员管理' },
      { name: 'Pinyin', description: '拼音课程与学习进度' },
      { name: 'Display', description: '展示端会话、设备与内容控制' },
      { name: 'Display Socket', description: '展示端 WebSocket 连接约定' },
    ],
    components: {
      securitySchemes: {
        userBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '用户登录后返回的 JWT。',
        },
        displayBearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '展示端 `pairToken` 或 `displayToken`。',
        },
      },
      schemas: {
        SuccessEnvelope: {
          type: 'object',
          required: ['code', 'msg', 'data'],
          properties: {
            code: {
              type: 'integer',
              enum: [0],
              example: 0,
            },
            msg: {
              type: 'string',
              example: '成功',
            },
            data: {},
          },
        },
        ErrorEnvelope: {
          type: 'object',
          required: ['code', 'msg', 'data'],
          properties: {
            code: {
              type: 'integer',
              example: 1000,
            },
            msg: {
              type: 'string',
              example: '未登录或登录已过期',
            },
            data: {
              type: 'null',
              nullable: true,
              example: null,
            },
            extra: {
              nullable: true,
            },
          },
        },
        User: {
          type: 'object',
          required: ['id', 'username', 'name', 'role', 'familyId', 'avatar'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['father', 'mother', 'child'],
            },
            familyId: {
              type: 'string',
              format: 'uuid',
              nullable: true,
            },
            avatar: {
              type: 'string',
              nullable: true,
            },
          },
        },
        Family: {
          type: 'object',
          required: ['id', 'code', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            code: { type: 'string' },
            name: { type: 'string' },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Member: {
          type: 'object',
          required: ['id', 'name', 'role', 'avatar'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['father', 'mother', 'child'],
            },
            avatar: {
              type: 'string',
              nullable: true,
            },
          },
        },
        AuthPayload: {
          type: 'object',
          required: ['user', 'family', 'token'],
          properties: {
            user: { $ref: '#/components/schemas/User' },
            family: {
              allOf: [{ $ref: '#/components/schemas/Family' }],
              nullable: true,
            },
            token: { type: 'string' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'password', 'name', 'role'],
          properties: {
            username: {
              type: 'string',
              description: '3-20 位字母、数字或下划线',
            },
            password: {
              type: 'string',
              minLength: 6,
            },
            name: { type: 'string' },
            role: {
              type: 'string',
              enum: ['father', 'mother', 'child'],
            },
            familyCode: {
              type: 'string',
              description: '可选，填写则加入已有家庭；为空则自动创建家庭',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: { type: 'string' },
            password: { type: 'string' },
          },
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['oldPassword', 'newPassword'],
          properties: {
            oldPassword: { type: 'string' },
            newPassword: { type: 'string', minLength: 6 },
          },
        },
        FamilyBundle: {
          type: 'object',
          required: ['family', 'members'],
          properties: {
            family: { $ref: '#/components/schemas/Family' },
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/Member' },
            },
          },
        },
        FamilyMembersData: {
          type: 'object',
          required: ['members'],
          properties: {
            members: {
              type: 'array',
              items: { $ref: '#/components/schemas/Member' },
            },
          },
        },
        FamilyUpdateRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        FamilyJoinRequest: {
          type: 'object',
          required: ['familyCode'],
          properties: {
            familyCode: { type: 'string' },
          },
        },
        FamilyCreateRequest: {
          type: 'object',
          properties: {
            name: { type: 'string' },
          },
        },
        PinyinLesson: {
          type: 'object',
          required: [
            'id',
            'title',
            'durationMinutes',
            'tagline',
            'focus',
            'goals',
            'teachingSteps',
            'practiceWords',
            'practiceSentence',
            'miniTask',
            'checkpoints',
          ],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            durationMinutes: { type: 'integer' },
            tagline: { type: 'string' },
            focus: { type: 'array', items: { type: 'string' } },
            goals: { type: 'array', items: { type: 'string' } },
            teachingSteps: { type: 'array', items: { type: 'string' } },
            practiceWords: { type: 'array', items: { type: 'string' } },
            practiceSentence: { type: 'string' },
            miniTask: { type: 'string' },
            checkpoints: { type: 'array', items: { type: 'string' } },
          },
        },
        PinyinStage: {
          type: 'object',
          required: ['id', 'title', 'description', 'lessons'],
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            lessons: {
              type: 'array',
              items: { $ref: '#/components/schemas/PinyinLesson' },
            },
          },
        },
        PinyinSummary: {
          type: 'object',
          required: [
            'completedLessonIds',
            'completedLessons',
            'totalLessons',
            'completionRate',
            'currentLessonId',
            'currentLesson',
            'lastCompletedLessonId',
            'updatedAt',
            'totalMinutes',
          ],
          properties: {
            completedLessonIds: {
              type: 'array',
              items: { type: 'string' },
            },
            completedLessons: { type: 'integer' },
            totalLessons: { type: 'integer' },
            completionRate: { type: 'integer' },
            currentLessonId: { type: 'string', nullable: true },
            currentLesson: {
              allOf: [{ $ref: '#/components/schemas/PinyinLesson' }],
              nullable: true,
            },
            lastCompletedLessonId: { type: 'string', nullable: true },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
            totalMinutes: { type: 'integer' },
          },
        },
        PinyinOverviewData: {
          type: 'object',
          required: ['stages', 'summary'],
          properties: {
            stages: {
              type: 'array',
              items: { $ref: '#/components/schemas/PinyinStage' },
            },
            summary: { $ref: '#/components/schemas/PinyinSummary' },
          },
        },
        PinyinSummaryData: {
          type: 'object',
          required: ['summary'],
          properties: {
            summary: { $ref: '#/components/schemas/PinyinSummary' },
          },
        },
        CompleteLessonRequest: {
          type: 'object',
          required: ['lessonId'],
          properties: {
            lessonId: { type: 'string' },
          },
        },
        CompleteLessonData: {
          type: 'object',
          required: ['summary', 'justCompletedLessonId'],
          properties: {
            summary: { $ref: '#/components/schemas/PinyinSummary' },
            justCompletedLessonId: { type: 'string' },
          },
        },
        DisplayDevice: {
          type: 'object',
          required: ['id', 'familyId', 'name', 'status', 'lastSeenAt'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            familyId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            status: {
              type: 'string',
              enum: ['offline', 'idle', 'active'],
            },
            lastSeenAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            currentScreenType: {
              type: 'string',
              enum: ['home', 'pinyin', 'message', 'image'],
              nullable: true,
            },
          },
        },
        DisplayState: {
          type: 'object',
          required: ['deviceId', 'screenType', 'payload', 'version', 'updatedAt'],
          properties: {
            deviceId: { type: 'string', format: 'uuid' },
            screenType: {
              type: 'string',
              enum: ['home', 'pinyin', 'message', 'image'],
            },
            payload: {
              type: 'object',
              additionalProperties: true,
            },
            version: { type: 'integer' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        DisplaySessionCreateRequest: {
          type: 'object',
          properties: {
            installationId: {
              type: 'string',
              minLength: 16,
              maxLength: 64,
            },
          },
        },
        DisplaySessionData: {
          type: 'object',
          required: ['sessionId', 'isBound', 'pairCode', 'expiresAt'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            isBound: { type: 'boolean' },
            pairCode: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
            pairToken: { type: 'string' },
            displayToken: { type: 'string' },
            device: { $ref: '#/components/schemas/DisplayDevice' },
            state: { $ref: '#/components/schemas/DisplayState' },
          },
        },
        DisplaySessionCreateData: {
          type: 'object',
          required: ['sessionId', 'pairCode', 'pairToken', 'expiresAt'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            pairCode: { type: 'string' },
            pairToken: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        DisplaySessionRefreshData: {
          type: 'object',
          required: ['sessionId', 'pairCode', 'expiresAt'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            pairCode: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' },
          },
        },
        DisplayPairRequest: {
          type: 'object',
          required: ['pairCode'],
          properties: {
            pairCode: { type: 'string', minLength: 6, maxLength: 6 },
            deviceName: { type: 'string' },
          },
        },
        DisplayPairData: {
          type: 'object',
          required: ['device', 'state'],
          properties: {
            device: { $ref: '#/components/schemas/DisplayDevice' },
            state: { $ref: '#/components/schemas/DisplayState' },
          },
        },
        DisplayDevicesData: {
          type: 'object',
          required: ['devices'],
          properties: {
            devices: {
              type: 'array',
              items: { $ref: '#/components/schemas/DisplayDevice' },
            },
          },
        },
        DisplayStateUpdateRequest: {
          type: 'object',
          required: ['screenType', 'payload'],
          properties: {
            screenType: {
              type: 'string',
              enum: ['home', 'pinyin', 'message', 'image'],
            },
            payload: {
              type: 'object',
              description: '按 screenType 变化的展示内容对象',
              additionalProperties: true,
            },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['System'],
          summary: '健康检查',
          operationId: 'getHealth',
          responses: {
            '200': {
              description: '服务运行正常',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['status', 'message'],
                    properties: {
                      status: { type: 'string' },
                      message: { type: 'string' },
                    },
                  },
                  example: {
                    status: 'ok',
                    message: 'Server is running',
                  },
                },
              },
            },
          },
        },
      },
      '/api/auth/register': {
        post: {
          tags: ['Auth'],
          summary: '注册用户',
          operationId: 'registerUser',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RegisterRequest' },
                example: registerRequestExample,
              },
            },
          },
          responses: {
            '201': successResponse(
              '注册成功',
              { $ref: '#/components/schemas/AuthPayload' },
              {
                user: userExample,
                family: familyExample,
                token: 'jwt-token-example',
              },
              '加入家庭成功'
            ),
            '400': errorResponse('参数错误', 400, 9000, '请填写所有必填字段：username, password, name, role'),
            '404': errorResponse('家庭码不存在', 404, 3003, '家庭邀请码不存在'),
            '409': errorResponse('用户名已存在', 409, 2001, '用户名已被注册'),
          },
        },
      },
      '/api/auth/login': {
        post: {
          tags: ['Auth'],
          summary: '用户登录',
          operationId: 'loginUser',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/LoginRequest' },
                example: {
                  username: 'parent01',
                  password: 'secret123',
                },
              },
            },
          },
          responses: {
            '200': successResponse(
              '登录成功',
              { $ref: '#/components/schemas/AuthPayload' },
              {
                user: userExample,
                family: familyExample,
                token: 'jwt-token-example',
              },
              '登录成功'
            ),
            '400': errorResponse('参数错误', 400, 9000, '请提供用户名和密码'),
            '401': errorResponse('用户名或密码错误', 401, 2002, '密码错误'),
          },
        },
      },
      '/api/auth/me': {
        get: {
          tags: ['Auth'],
          summary: '获取当前登录用户',
          operationId: 'getCurrentUser',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              {
                type: 'object',
                required: ['user', 'family'],
                properties: {
                  user: { $ref: '#/components/schemas/User' },
                  family: {
                    allOf: [{ $ref: '#/components/schemas/Family' }],
                    nullable: true,
                  },
                },
              },
              {
                user: userExample,
                family: familyExample,
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('令牌无效', 403, 1002, '登录令牌无效'),
          },
        },
      },
      '/api/auth/password': {
        put: {
          tags: ['Auth'],
          summary: '修改密码',
          operationId: 'changePassword',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChangePasswordRequest' },
                example: {
                  oldPassword: 'secret123',
                  newPassword: 'newSecret123',
                },
              },
            },
          },
          responses: {
            '200': successResponse('修改成功', { type: 'null', nullable: true }, null, '密码修改成功'),
            '400': errorResponse('参数错误', 400, 9000, '请提供旧密码和新密码'),
            '401': errorResponse('旧密码错误', 401, 2002, '旧密码错误'),
            '403': errorResponse('令牌无效', 403, 1002, '登录令牌无效'),
          },
        },
      },
      '/api/family': {
        get: {
          tags: ['Family'],
          summary: '获取当前家庭信息',
          operationId: 'getFamily',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              { $ref: '#/components/schemas/FamilyBundle' },
              {
                family: {
                  ...familyExample,
                  createdAt: '2026-04-01T10:00:00.000Z',
                },
                members: [memberExample],
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('未加入家庭', 404, 3000, '您还没有加入家庭'),
          },
        },
        put: {
          tags: ['Family'],
          summary: '更新家庭名称',
          operationId: 'updateFamily',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FamilyUpdateRequest' },
                example: {
                  name: '新的家庭名称',
                },
              },
            },
          },
          responses: {
            '200': successResponse(
              '更新成功',
              {
                type: 'object',
                required: ['family'],
                properties: {
                  family: { $ref: '#/components/schemas/Family' },
                },
              },
              {
                family: {
                  ...familyExample,
                  name: '新的家庭名称',
                },
              },
              '家庭信息更新成功'
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('无权限修改', 403, 1001, '只有家庭创建者可以修改家庭信息'),
            '404': errorResponse('家庭不存在', 404, 3000, '家庭不存在'),
          },
        },
      },
      '/api/family/members': {
        get: {
          tags: ['Family'],
          summary: '获取家庭成员列表',
          operationId: 'getFamilyMembers',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              { $ref: '#/components/schemas/FamilyMembersData' },
              {
                members: [memberExample],
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/family/join': {
        post: {
          tags: ['Family'],
          summary: '加入家庭',
          operationId: 'joinFamily',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FamilyJoinRequest' },
                example: {
                  familyCode: 'A8C2K9',
                },
              },
            },
          },
          responses: {
            '200': successResponse(
              '加入成功',
              { $ref: '#/components/schemas/FamilyBundle' },
              {
                family: familyExample,
                members: [memberExample],
              },
              '加入家庭成功'
            ),
            '400': errorResponse('参数错误', 400, 9000, '请提供家庭码'),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('家庭码不存在', 404, 3003, '家庭邀请码不存在'),
          },
        },
      },
      '/api/family/leave': {
        post: {
          tags: ['Family'],
          summary: '离开当前家庭',
          operationId: 'leaveFamily',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse('离开成功', { type: 'null', nullable: true }, null, '已离开家庭'),
            '400': errorResponse('不能离开', 400, 3007, '家庭创建者不能离开家庭，请先转让家庭或删除家庭'),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/family/create': {
        post: {
          tags: ['Family'],
          summary: '创建新家庭',
          operationId: 'createFamily',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/FamilyCreateRequest' },
                example: {
                  name: '新的家庭',
                },
              },
            },
          },
          responses: {
            '201': successResponse(
              '创建成功',
              { $ref: '#/components/schemas/FamilyBundle' },
              {
                family: familyExample,
                members: [memberExample],
              },
              '创建家庭成功'
            ),
            '400': errorResponse('创建失败', 400, 3005, '您已创建家庭，无法创建新家庭。请先删除原家庭或转让家庭。'),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/pinyin/overview': {
        get: {
          tags: ['Pinyin'],
          summary: '获取拼音课程总览',
          operationId: 'getPinyinOverview',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              { $ref: '#/components/schemas/PinyinOverviewData' },
              {
                stages: [
                  {
                    id: 'grade-1-foundation',
                    title: '一年级上: 拼音启蒙',
                    description: '从声调、单韵母和基础声母开始。',
                    lessons: [pinyinLessonExample],
                  },
                ],
                summary: pinyinSummaryExample,
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/pinyin/summary': {
        get: {
          tags: ['Pinyin'],
          summary: '获取拼音学习进度摘要',
          operationId: 'getPinyinSummary',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              { $ref: '#/components/schemas/PinyinSummaryData' },
              {
                summary: pinyinSummaryExample,
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/pinyin/progress/complete': {
        post: {
          tags: ['Pinyin'],
          summary: '记录课程完成',
          operationId: 'completePinyinLesson',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CompleteLessonRequest' },
                example: {
                  lessonId: 'py-03',
                },
              },
            },
          },
          responses: {
            '200': successResponse(
              '记录成功',
              { $ref: '#/components/schemas/CompleteLessonData' },
              {
                summary: {
                  ...pinyinSummaryExample,
                  completedLessonIds: ['py-01', 'py-02', 'py-03'],
                  completedLessons: 3,
                  currentLessonId: 'py-04',
                  lastCompletedLessonId: 'py-03',
                },
                justCompletedLessonId: 'py-03',
              },
              '课程进度已记录'
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('课程不存在', 404, 9001, '课程不存在'),
          },
        },
      },
      '/api/display/session': {
        post: {
          tags: ['Display'],
          summary: '创建展示端配对会话',
          operationId: 'createDisplaySession',
          requestBody: {
            required: false,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisplaySessionCreateRequest' },
                example: displaySessionCreateExample,
              },
            },
          },
          responses: {
            '201': successResponse(
              '创建成功',
              { $ref: '#/components/schemas/DisplaySessionCreateData' },
              {
                sessionId: displaySessionResponseExample.sessionId,
                pairCode: displaySessionResponseExample.pairCode,
                pairToken: displaySessionResponseExample.pairToken,
                expiresAt: displaySessionResponseExample.expiresAt,
              }
            ),
            '400': errorResponse('安装标识不合法', 400, 9001, '无效的展示端安装标识'),
          },
        },
        get: {
          tags: ['Display'],
          summary: '获取展示端会话状态',
          description: 'Authorization 可使用 `pairToken` 或 `displayToken`。',
          operationId: 'getDisplaySession',
          security: [{ displayBearerAuth: [] }],
          responses: {
            '200': {
              description: '获取成功',
              content: {
                'application/json': {
                  schema: successEnvelopeSchema({ $ref: '#/components/schemas/DisplaySessionData' }),
                  examples: {
                    pending: {
                      summary: '未绑定状态',
                      value: {
                        code: 0,
                        msg: '成功',
                        data: displaySessionResponseExample,
                      },
                    },
                    bound: {
                      summary: '已绑定状态',
                      value: {
                        code: 0,
                        msg: '成功',
                        data: displayBoundSessionResponseExample,
                      },
                    },
                  },
                },
              },
            },
            '401': errorResponse('未提供 token', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('展示端 token 无效', 403, 6005, '展示端令牌无效'),
          },
        },
      },
      '/api/display/session/refresh': {
        post: {
          tags: ['Display'],
          summary: '刷新展示端配对码',
          description: 'Authorization 使用 `pairToken`。',
          operationId: 'refreshDisplaySession',
          security: [{ displayBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '刷新成功',
              { $ref: '#/components/schemas/DisplaySessionRefreshData' },
              {
                sessionId: displaySessionResponseExample.sessionId,
                pairCode: '654321',
                expiresAt: '2026-04-14T13:30:00.000Z',
              },
              '配对码已刷新'
            ),
            '400': errorResponse('已绑定不能刷新', 400, 6004, '展示端已绑定，无法刷新配对码'),
            '401': errorResponse('未提供 token', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('展示端 token 无效', 403, 6005, '展示端令牌无效'),
          },
        },
      },
      '/api/display/session/heartbeat': {
        post: {
          tags: ['Display'],
          summary: '上报展示端心跳',
          description: 'Authorization 使用 `displayToken`。',
          operationId: 'heartbeatDisplaySession',
          security: [{ displayBearerAuth: [] }],
          responses: {
            '200': successResponse('上报成功', { type: 'null', nullable: true }, null, '心跳已更新'),
            '400': errorResponse('尚未绑定', 400, 6000, '展示端尚未绑定'),
            '401': errorResponse('未提供 token', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('展示端 token 无效', 403, 6005, '展示端令牌无效'),
          },
        },
      },
      '/api/display/state': {
        get: {
          tags: ['Display'],
          summary: '获取展示端当前状态',
          description: 'Authorization 使用 `displayToken`。',
          operationId: 'getDisplayState',
          security: [{ displayBearerAuth: [] }],
          responses: {
            '200': successResponse('获取成功', { $ref: '#/components/schemas/DisplayState' }, displayStateExample),
            '400': errorResponse('尚未绑定', 400, 6000, '展示端尚未绑定'),
            '401': errorResponse('未提供 token', 401, 1000, '未登录或登录已过期'),
            '403': errorResponse('展示端 token 无效', 403, 6005, '展示端令牌无效'),
            '404': errorResponse('展示状态不存在', 404, 6001, '展示状态不存在'),
          },
        },
      },
      '/api/display/pair': {
        post: {
          tags: ['Display'],
          summary: '控制端绑定展示设备',
          operationId: 'pairDisplayDevice',
          security: [{ userBearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisplayPairRequest' },
                example: {
                  pairCode: '123456',
                  deviceName: '客厅电视',
                },
              },
            },
          },
          responses: {
            '200': successResponse(
              '绑定成功',
              { $ref: '#/components/schemas/DisplayPairData' },
              {
                device: displayDeviceExample,
                state: displayStateExample,
              },
              '展示端绑定成功'
            ),
            '400': errorResponse('参数错误', 400, 9000, '请提供配对码'),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('配对码无效', 404, 6002, '配对码无效'),
            '410': errorResponse('配对码已过期', 410, 6003, '配对码已过期'),
          },
        },
      },
      '/api/display/devices': {
        get: {
          tags: ['Display'],
          summary: '获取家庭展示设备列表',
          operationId: 'getDisplayDevices',
          security: [{ userBearerAuth: [] }],
          responses: {
            '200': successResponse(
              '获取成功',
              { $ref: '#/components/schemas/DisplayDevicesData' },
              {
                devices: [displayDeviceExample],
              }
            ),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
          },
        },
      },
      '/api/display/devices/{deviceId}/state': {
        get: {
          tags: ['Display'],
          summary: '获取指定展示设备状态',
          operationId: 'getDisplayDeviceState',
          security: [{ userBearerAuth: [] }],
          parameters: [
            {
              name: 'deviceId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': successResponse('获取成功', { $ref: '#/components/schemas/DisplayState' }, displayStateExample),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('设备不存在', 404, 6001, '展示设备不存在'),
          },
        },
        put: {
          tags: ['Display'],
          summary: '更新指定展示设备内容',
          operationId: 'updateDisplayDeviceState',
          security: [{ userBearerAuth: [] }],
          parameters: [
            {
              name: 'deviceId',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DisplayStateUpdateRequest' },
                examples: {
                  home: {
                    summary: '首页展示',
                    value: {
                      screenType: 'home',
                      payload: {
                        title: '欢迎来到家庭展示屏',
                        subtitle: '可以开始今天的家庭安排',
                        hint: '请在手机端继续切换内容',
                      },
                    },
                  },
                  pinyin: {
                    summary: '拼音展示',
                    value: {
                      screenType: 'pinyin',
                      payload: {
                        title: '拼音练习时间',
                        focusText: 'ai ei ui',
                        note: '先读三遍，再跟着拼读',
                      },
                    },
                  },
                  message: {
                    summary: '消息展示',
                    value: {
                      screenType: 'message',
                      payload: {
                        title: '休息一下',
                        subtitle: '五分钟后继续',
                      },
                    },
                  },
                  image: {
                    summary: '图片展示',
                    value: {
                      screenType: 'image',
                      payload: {
                        title: '图片展示',
                        imageUrl: 'https://example.com/image.jpg',
                        caption: '请输入一张公开可访问的图片地址',
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('更新成功', { $ref: '#/components/schemas/DisplayState' }, displayStateExample, '展示内容已更新'),
            '400': errorResponse('参数错误', 400, 9001, '无效的展示类型'),
            '401': errorResponse('未登录', 401, 1000, '未登录或登录已过期'),
            '404': errorResponse('设备不存在', 404, 6001, '展示设备不存在'),
          },
        },
      },
      '/ws/display': {
        get: {
          tags: ['Display Socket'],
          summary: '展示端 WebSocket 握手入口',
          description: [
            '以 WebSocket Upgrade 方式建立连接。',
            '查询参数：`token` 为用户控制端 JWT、展示端 `pairToken` 或 `displayToken`；`role` 取值 `control` 或 `display`。',
            '连接成功后服务端会下发 `socket_ready`，随后可能推送 `session_bound`、`session_refreshed`、`display_state`、`device_presence`、`device_state` 等消息。',
          ].join('\n'),
          operationId: 'connectDisplaySocket',
          parameters: [
            {
              name: 'token',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'role',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
                enum: ['control', 'display'],
              },
            },
          ],
          responses: {
            '101': {
              description: 'WebSocket 握手成功，连接升级完成',
            },
            '400': {
              description: '握手参数缺失或 Upgrade 头不合法',
            },
            '403': {
              description: 'token 校验失败',
            },
          },
        },
      },
    },
  };
}

function writeSpec(spec) {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(spec, null, 2)}\n`, 'utf8');
}

function postJson(url, headers, body) {
  return new Promise((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          ...headers,
        },
      },
      (response) => {
        let chunks = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          chunks += chunk;
        });
        response.on('end', () => {
          resolve({
            statusCode: response.statusCode,
            body: chunks,
          });
        });
      }
    );

    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

async function importToApifox(spec) {
  const token = process.env.APIFOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error('缺少 APIFOX_ACCESS_TOKEN 环境变量');
  }

  const projectId = process.env.APIFOX_PROJECT_ID || DEFAULT_PROJECT_ID;
  const targetEndpointFolderId = process.env.APIFOX_ENDPOINT_FOLDER_ID;
  const targetSchemaFolderId = process.env.APIFOX_SCHEMA_FOLDER_ID;
  const specString = JSON.stringify(spec);
  const options = {
    endpointOverwriteBehavior: 'deleteUnmatchedResources',
    schemaOverwriteBehavior: 'KEEP_EXISTING',
    updateFolderOfChangedEndpoint: true,
    prependBasePath: true,
  };

  if (targetEndpointFolderId) {
    options.targetEndpointFolderId = Number(targetEndpointFolderId);
  }

  if (targetSchemaFolderId) {
    options.targetSchemaFolderId = Number(targetSchemaFolderId);
  }

  const basePayload = { options };

  const candidates = [
    {
      label: 'string-input',
      payload: {
        ...basePayload,
        input: specString,
      },
    },
    {
      label: 'input-data',
      payload: {
        ...basePayload,
        input: {
          data: specString,
        },
      },
    },
    {
      label: 'swagger-object',
      payload: {
        ...basePayload,
        swagger: spec,
      },
    },
  ];

  let lastFailure = null;

  for (const candidate of candidates) {
    const response = await postJson(
      `https://api.apifox.com/v1/projects/${projectId}/import-openapi?locale=zh-CN`,
      {
        Authorization: `Bearer ${token}`,
        'X-Apifox-Api-Version': APIFOX_API_VERSION,
      },
      JSON.stringify(candidate.payload)
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      let parsed = null;
      try {
        parsed = JSON.parse(response.body);
      } catch {
        parsed = { raw: response.body };
      }

      if (parsed?.data?.errors?.length) {
        lastFailure = {
          method: candidate.label,
          statusCode: response.statusCode,
          body: parsed,
        };
        continue;
      }

      return {
        method: candidate.label,
        response: parsed,
      };
    }

    lastFailure = {
      method: candidate.label,
      statusCode: response.statusCode,
      body: response.body,
    };
  }

  throw new Error(`Apifox 导入失败：${JSON.stringify(lastFailure)}`);
}

async function main() {
  const spec = buildSpec();
  writeSpec(spec);
  console.log(`OpenAPI 已写入 ${OUTPUT_PATH}`);

  if (process.argv.includes('--write-only')) {
    return;
  }

  const result = await importToApifox(spec);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});
