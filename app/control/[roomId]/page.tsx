import ControlClient from "./ControlClient";

export default function ControlPage({ params }: { params: { roomId?: string } }) {
  const rid = params?.roomId ?? "(missing)";
  return (
    <>
      <div style={{ display: "none" }} data-server-roomid={rid} />
      <ControlClient roomId={rid} />
    </>
  );
}
