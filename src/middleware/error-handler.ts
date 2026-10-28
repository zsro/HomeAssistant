import type { ErrorRequestHandler, RequestHandler } from 'express';
import { UniqueConstraintError } from 'sequelize';
import { ZodError } from 'zod';
import { AppError } from '../lib/app-error';

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new AppError(404, 'NOT_FOUND', '接口不存在'));
};

export const errorHandler: ErrorRequestHandler = (error: unknown, request, response, _next) => {
  void _next;
  if (error instanceof ZodError) {
    const missingInvite = error.issues.some((issue) => issue.path[0] === 'inviteCode' && issue.code === 'invalid_type');
    return response.status(400).json({
      success: false,
      error: {
        code: missingInvite ? 'INVITE_REQUIRED' : 'VALIDATION_ERROR',
        message: missingInvite ? '注册必须提供邀请码' : '请求参数格式错误',
        details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
      },
    });
  }

  if (error instanceof AppError) {
    const body: { success: false; error: { code: string; message: string; details?: unknown } } = {
      success: false,
      error: { code: error.code, message: error.message },
    };
    if (error.details !== undefined) body.error.details = error.details;
    return response.status(error.status).json(body);
  }

  if (error instanceof UniqueConstraintError) {
    return response.status(409).json({
      success: false,
      error: { code: 'RESOURCE_CONFLICT', message: '数据已存在' },
    });
  }

  if (error && typeof error === 'object' && 'type' in error && 'status' in error) {
    const parserErrors: Record<string, [number, string, string]> = {
      'entity.too.large': [413, 'PAYLOAD_TOO_LARGE', '请求体超过大小限制'],
      'entity.parse.failed': [400, 'INVALID_JSON', '请求体 JSON 格式错误'],
      'encoding.unsupported': [415, 'ENCODING_UNSUPPORTED', '不支持此请求编码'],
      'charset.unsupported': [415, 'CHARSET_UNSUPPORTED', '不支持此字符编码'],
      'request.aborted': [400, 'REQUEST_ABORTED', '请求传输中断'],
    };
    const mapped = parserErrors[String(error.type)];
    if (mapped) return response.status(mapped[0]).json({ success: false, error: { code: mapped[1], message: mapped[2] } });
  }

  request.log.error({ err: error }, 'unhandled request error');
  return response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
};
