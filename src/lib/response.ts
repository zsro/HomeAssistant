import type { Response } from 'express';

export function sendSuccess(response: Response, data: unknown, status = 200) {
  return response.status(status).json({ success: true, data });
}
