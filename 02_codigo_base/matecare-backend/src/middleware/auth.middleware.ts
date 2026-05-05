import { Request, Response, NextFunction } from 'express'
// TODO: verificar JWT de Supabase Auth
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // TODO: implementar
  next()
}
