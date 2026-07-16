import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('code')?.trim()
  if (!raw) return NextResponse.json({ name: null })

  const candidates = Array.from(new Set([raw, raw.toLowerCase(), raw.toUpperCase()])).filter(Boolean)

  // 1) Direct code lookup (case-flexible)
  const { data: byCode } = await supabase
    .from('licensees')
    .select('name')
    .in('code', candidates)
    .maybeSingle()
  if (byCode?.name) return NextResponse.json({ name: byCode.name })

  // 2) room -> licensee mapping table
  const { data: roomMap } = await supabase
    .from('licensee_rooms')
    .select('licensee_id')
    .in('room_id', candidates)
    .maybeSingle()
  if (roomMap?.licensee_id) {
    const { data: mapped } = await supabase
      .from('licensees')
      .select('name')
      .eq('id', roomMap.licensee_id)
      .maybeSingle()
    if (mapped?.name) return NextResponse.json({ name: mapped.name })
  }

  // 3) device assignment fallback
  const { data: device } = await supabase
    .from('devices')
    .select('licensee_id,last_seen')
    .in('room_id', candidates)
    .not('licensee_id', 'is', null)
    .order('last_seen', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (device?.licensee_id) {
    const { data: mapped } = await supabase
      .from('licensees')
      .select('name')
      .eq('id', device.licensee_id)
      .maybeSingle()
    return NextResponse.json({ name: mapped?.name || null })
  }

  return NextResponse.json({ name: null })
}
