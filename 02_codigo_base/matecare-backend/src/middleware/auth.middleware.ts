import { Request, Response, NextFunction } from 'express'
import { supabase } from '../lib/supabase'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' })
  }

  const token = authHeader.split(' ')[1]
  
  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    console.error('Auth Error:', error?.message)
    return res.status(401).json({ error: 'Unauthorized or invalid token' })
  }

  // Inject user info into request for controllers to use
  (req as any).user = user
  next()
}
