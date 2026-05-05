import { Request, Response, NextFunction } from 'express'
// TODO: verificar que user.plan === PREMIUM para features premium
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  // TODO: implementar
  next()
}
