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

  request.log.error({ err: error }, 'unhandled request error');
  return response.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: '服务器内部错误' },
  });
};
