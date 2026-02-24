import ControlClient from "./ControlClient";

export default function ControlPage({ params }: { params: { room: string } }) {
  // Server component: params.room should always exist for /control/<roomId>
  return <ControlClient roomId={params.room} />;
}
