export default function Home() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#000",
      color: "#fff"
    }}>
      <h1 style={{ marginBottom: "20px" }}>
        IMA Studio Player
      </h1>

      <video
        width="800"
        controls
        style={{ borderRadius: "12px" }}
      >
        <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
