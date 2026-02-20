import AdminClient from "./AdminClient";
import { requireAdminRole } from "@/lib/auth/requireAdmin";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  try {
    const { role } = await requireAdminRole();
    return <AdminClient role={role} />;
  } catch (e: any) {
    return (
      <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff", padding: 18 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ margin: "10px 0 10px", fontSize: 34, fontWeight: 900 }}>
            IMAOS Command Center
          </h1>
          <div style={{ opacity: 0.8, marginBottom: 14 }}>
            You are not authorized for admin access.
          </div>

          <form action={signOut}>
            <button
              type="submit"
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "#374151",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    );
  }
}
