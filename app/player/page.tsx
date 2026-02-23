import PlayerClient from "./PlayerClient";

export default async function PlayerPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PlayerClient code={code} />;
}
