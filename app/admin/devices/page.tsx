import DevicesClient from "./DevicesClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AdminDevicesPage() {
  return <DevicesClient />;
}
