// app/admin/users/page.tsx
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import Link from "next/link";
import { requireAdminRole } from "@/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function makeReqFromCookies(pathname: string) {
  // Next 15/16: cookies() is async
  return cookies().then((cookieStore) => {
    const cookieHeader = cookieStore
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    return new NextRequest(`http://localhost${pathname}`, {
      headers: { cookie: cookieHeader },
    });
  });
}

export default async function AdminUsersPage() {
  const req = await makeReqFromCookies("/admin/users");

  try {
    const { role } = await requireAdminRole(req, ["super_admin", "admin"]);

    // If you already have a client component here, keep it.
    // Example:
    // return <UsersClient role={role} />;

    // Minimal working page (no extra components required):
    return (
      <div style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Admin Users</h1>
          <Link href="/admin" style={{ textDecoration: "underline" }}>
            ← Back to Admin
          </Link>
        </div>

        <p style={{ marginTop: 10, opacity: 0.85 }}>
          Logged in as: <b>{role}</b>
        </p>

        <div style={{ marginTop: 18, padding: 16, border: "1px solid #333", borderRadius: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Next step</h2>
          <p style={{ marginTop: 8, opacity: 0.9 }}>
            This page is now protected. Next we’ll wire a simple “Invite user by email” form
            (Supabase Admin invite) and add them to <code>admin_users</code>.
          </p>
        </div>
      </div>
    );
  } catch {
    return (
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Logged OUT</h1>
        <p style={{ marginTop: 8, opacity: 0.9 }}>Please log in to access /admin/users.</p>
        <p style={{ marginTop: 10 }}>
          <Link href="/login" style={{ textDecoration: "underline" }}>
            Go to Login
          </Link>
        </p>
      </div>
    );
  }
}
