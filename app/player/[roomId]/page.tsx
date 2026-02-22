import { headers } from "next/headers";
import PlayerClient from "./PlayerClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function getBaseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function PlayerRoomPage({
  params,
}: {
  params: { roomId: string };
}) {
  const baseUrl = await getBaseUrl();
  const roomId = (params?.roomId || "").trim();

  return <PlayerClient roomId={roomId} baseUrl={baseUrl} />;
}
