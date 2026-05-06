import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestUser() {
  const { data, error } = await supabase.auth.signUp({
    email: 'guerrero@matecare.com',
    password: 'MateCare2026!',
  })

  if (error) {
    console.error('Error creando usuario:', error.message)
  } else {
    console.log('¡Usuario creado con éxito!')
    console.log('ID:', data.user?.id)
    console.log('Email:', data.user?.email)
    console.log('---')
    console.log('Ya puedes entrar a la app con estos datos.')
  }
}

createTestUser()
