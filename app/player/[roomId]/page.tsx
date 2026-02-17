"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-browser'; // adjust path

export default function PlayerPage({ params }: { params: { roomId: string } }) {
  const [playbackId, setPlaybackId] = useState<string | null>(null);
  const supabase = createClient(); // your browser client

  useEffect(() => {
    // Initial fetch
    const fetchRoom = async () => {
      const { data } = await supabase
        .from('rooms') // adjust table name
        .select('mux_playback_id')
        .eq('id', params.roomId)
        .single();

      if (data?.mux_playback_id) {
        setPlaybackId(data.mux_playback_id);
      }
    };
    fetchRoom();

    // Realtime subscription
    const channel = supabase.channel(`room:${params.roomId}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${params.roomId}` },
        (payload) => {
          const newId = payload.new.mux_playback_id;
          if (newId) setPlaybackId(newId);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [params.roomId, supabase]);

  if (!playbackId) return <div>Loading room {params.roomId}...</div>;

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'black' }}>
      <video
        autoPlay
        controls
        style={{ width: '100%', height: '100%' }}
        src={`https://stream.mux.com/${playbackId}.m3u8`}
      />
    </div>
  );
}
