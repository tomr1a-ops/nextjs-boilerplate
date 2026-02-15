import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // GET current room state
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("room_sessions")
      .select("*")
      .eq("room_id", "studioA")
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  // POST update room state
  if (req.method === "POST") {
    const { state, playback_id, started_at } = req.body || {};

    const { error } = await supabase
      .from("room_sessions")
      .update({
        state,
        playback_id,
        started_at,
      })
      .eq("room_id", "studioA");

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
