import PlayerClient from "./PlayerClient";

export default async function PlayerPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = await params;
  return <PlayerClient roomId={roomId} />;
}
