import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function requireAdminPage() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data?.user;

  if (!user) redirect("/login?next=/admin");

  const { data: row } = await supabase
    .from("admin_users")
    .select("role, active")
    .eq("user_id", user.id)
    .maybeSingle();

  const role = String(row?.role || "");
  const active = row?.active !== false;

  if (!active || !role) redirect("/login?next=/admin");

  return { role, email: user.email ?? "" };
}

export default async function AdminPage() {
  const { role, email } = await requireAdminPage();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)",
        color: "#fff",
        padding: "40px 24px",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 900,
              margin: 0,
              background: "linear-gradient(135deg, #60a5fa 0%, #22c55e 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: -2,
            }}
          >
            IMAOS Command Center
          </h1>
          <div style={{ marginTop: 16, fontSize: 16, opacity: 0.7 }}>
            Logged in as <strong>{email}</strong> — {role}
          </div>
        </div>

        {/* Main Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 24,
            marginBottom: 40,
          }}
        >
          {/* Licensees Card */}
          <Link
            href="/admin/licensees"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                padding: 32,
                borderRadius: 24,
                background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                border: "1px solid rgba(96, 165, 250, 0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(59, 130, 246, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
                Licensees
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Manage licensees, assign videos, and control access
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  fontSize: 32,
                  opacity: 0.3,
                }}
              >
                →
              </div>
            </div>
          </Link>

          {/* Users Card */}
          <Link
            href="/admin/users"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                padding: 32,
                borderRadius: 24,
                background: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 100%)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(124, 58, 237, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
                Admin Users
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Manage admin accounts and permissions
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  fontSize: 32,
                  opacity: 0.3,
                }}
              >
                →
              </div>
            </div>
          </Link>

          {/* Videos Card */}
          <Link
            href="/admin/videos"
            style={{
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div
              style={{
                padding: 32,
                borderRadius: 24,
                background: "linear-gradient(135deg, #15803d 0%, #22c55e 100%)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 20px 40px rgba(34, 197, 94, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
              <div style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>
                Videos
              </div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                Upload and manage video content library
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 16,
                  right: 16,
                  fontSize: 32,
                  opacity: 0.3,
                }}
              >
                →
              </div>
            </div>
          </Link>
        </div>

        {/* Quick Stats */}
        <div
          style={{
            marginTop: 60,
            padding: 32,
            borderRadius: 24,
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              marginBottom: 24,
              opacity: 0.9,
            }}
          >
            Quick Links
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 16,
            }}
          >
            <Link
              href="/admin/licensees"
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(59, 130, 246, 0.1)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                textDecoration: "none",
                color: "#60a5fa",
                fontWeight: 700,
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.1)";
              }}
            >
              Manage Licensees
            </Link>

            <Link
              href="/admin/videos"
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(34, 197, 94, 0.1)",
                border: "1px solid rgba(34, 197, 94, 0.3)",
                textDecoration: "none",
                color: "#22c55e",
                fontWeight: 700,
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(34, 197, 94, 0.1)";
              }}
            >
              Upload Videos
            </Link>

            <Link
              href="/admin/users"
              style={{
                padding: "16px 20px",
                borderRadius: 12,
                background: "rgba(167, 139, 250, 0.1)",
                border: "1px solid rgba(167, 139, 250, 0.3)",
                textDecoration: "none",
                color: "#a78bfa",
                fontWeight: 700,
                textAlign: "center",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(167, 139, 250, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(167, 139, 250, 0.1)";
              }}
            >
              Admin Users
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
