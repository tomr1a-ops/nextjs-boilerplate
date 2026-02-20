import ControlClient from "./ControlClient";

export default function ControlPage({ params }: { params: { roomId: string } }) {
  // Server component: params.roomId should always exist for /control/<roomId>
  return <ControlClient roomId={params.roomId} />;
}
