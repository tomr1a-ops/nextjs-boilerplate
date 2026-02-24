import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ name: null })

  const { data } = await supabase
    .from('licensees')
    .select('name')
    .eq('code', code)
    .single()

  return NextResponse.json({ name: data?.name || null })
}
