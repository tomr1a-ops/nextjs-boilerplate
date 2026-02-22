// app/admin/layout.tsx
import Link from "next/link";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0b0b0b", color: "#fff" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: 18 }}>
        {/* Top Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 14,
            border: "1px solid #2a2a2a",
            background: "#0f0f0f",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 900, letterSpacing: 0.3 }}>IMAOS Admin</div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/admin"
                style={{
                  color: "#fff",
                  textDecoration: "none",
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #2a2a2a",
                  background: "#141414",
                  fontWeight: 800,
                }}
              >
                Dashboard
              </Link>

              <Link
                href="/admin/licensees"
                style={{
                  color: "#7dd3fc",
                  textDecoration: "none",
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #2a2a2a",
                  background: "#141414",
                  fontWeight: 800,
                }}
              >
                Licensees
              </Link>

              <Link
                href="/admin/users"
                style={{
                  color: "#a7f3d0",
                  textDecoration: "none",
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #2a2a2a",
                  background: "#141414",
                  fontWeight: 800,
                }}
              >
                Users
              </Link>

              <Link
                href="/admin/videos"
                style={{
                  color: "#fcd34d",
                  textDecoration: "none",
                  padding: "8px 10px",
                  borderRadius: 12,
                  border: "1px solid #2a2a2a",
                  background: "#141414",
                  fontWeight: 800,
                }}
              >
                Videos
              </Link>
            </div>
          </div>

          <Link
            href="/"
            style={{
              color: "#bbb",
              textDecoration: "none",
              padding: "8px 10px",
              borderRadius: 12,
              border: "1px solid #2a2a2a",
              background: "#141414",
              fontWeight: 800,
            }}
          >
            Home
          </Link>
        </div>

        {/* Page Body */}
        <div style={{ marginTop: 14 }}>{children}</div>
      </div>
    </div>
  );
}
