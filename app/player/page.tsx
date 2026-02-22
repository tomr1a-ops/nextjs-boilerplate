import PlayerClient from "./PlayerClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function PlayerPage() {
  return <PlayerClient />;
}
