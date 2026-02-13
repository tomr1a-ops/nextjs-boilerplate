export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#000",
        color: "#fff",
        padding: "24px",
      }}
    >
      <h1 style={{ marginBottom: "20px" }}>IMA Studio Player</h1>

      <iframe
        src="https://player.mux.com/EEtT1vz9FZ01DpH4iyByDjwV5w102dhuVOo6EEp12eHMU"
        style={{
          width: "90%",
          maxWidth: "900px",
          aspectRatio: "16/9",
          border: "none",
          borderRadius: "12px",
        }}
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
        allowFullScreen
      />
    </div>
  );
}
