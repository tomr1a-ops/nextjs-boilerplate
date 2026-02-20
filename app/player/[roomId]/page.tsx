import PlayerClient from "./PlayerClient";

export default function PlayerPage({ params }: { params: { roomId: string } }) {
  return <PlayerClient roomId={params.roomId} />;
}
