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
  if (user) {
    const sanitizedId = user.id.trim();
    console.log(`[AUTH] User Authenticated: ${user.email} (ID: ${sanitizedId}, Len: ${sanitizedId.length})`);
    (req as any).user = { ...user, id: sanitizedId };
  }
  next()
}
