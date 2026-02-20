import ControlClient from "./ControlClient";

export default function Page({
  params,
}: {
  params: { roomId: string };
}) {
  return <ControlClient roomId={params.roomId} />;
}
