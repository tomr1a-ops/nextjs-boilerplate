import ControlClient from "./ControlClient";

export default function ControlPage({
  params,
}: {
  params: { roomId: string };
}) {
  return <ControlClient roomId={params.roomId} />;
}
