import type { User } from '../database/models/user';

declare global {
  namespace Express {
    interface Request {
      authUser?: User;
    }
  }
}

export {};
