import { loginAction } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { error?: string };
}) {
  const error = searchParams?.error;

  return (
    <div style={{ padding: 24, color: "#fff" }}>
      <h1>Login</h1>

      {error ? (
        <p style={{ color: "salmon" }}>Error: {decodeURIComponent(error)}</p>
      ) : null}

      <form action={loginAction} style={{ display: "grid", gap: 12, maxWidth: 360 }}>
        <input name="email" placeholder="email" />
        <input name="password" placeholder="password" type="password" />
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
