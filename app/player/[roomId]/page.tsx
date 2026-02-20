import PlayerClient from "./PlayerClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function clean(v: any) {
  return (v ?? "").toString().trim();
}

// Supports Next versions/tooling where params may be Promise-wrapped
async function getRoomId(ctx: any): Promise<string> {
  const p = ctx?.params;
  const obj = p && typeof p.then === "function" ? await p : p;
  return clean(obj?.roomId);
}

export default async function PlayerPage(ctx: any) {
  const roomId = await getRoomId(ctx);
  return <PlayerClient roomId={roomId || "studioA"} />;
}
