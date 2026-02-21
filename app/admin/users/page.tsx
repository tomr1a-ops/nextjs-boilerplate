// app/admin/users/page.tsx
import UsersClient from "./UsersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminUsersPage() {
  return <UsersClient />;
}
