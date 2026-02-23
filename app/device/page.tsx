"use client";

import { useState } from "react";

export default function DevicePage() {
  const [pairCode, setPairCode] = useState("");
  const [status, setStatus] = useState("");

  const register = async () => {
    setStatus("Pairing...");

    try {
      const res = await fetch("/api/device/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair_code: pairCode,
          device_id: "nvidia-" + crypto.randomUUID(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus(data.error || "Failed");
        return;
      }

      localStorage.setItem("device_token", data.device_token);
      localStorage.setItem("room_id", data.room_id);

      setStatus("Paired successfully!");
    } catch (err: any) {
      setStatus("Error connecting to server");
    }
  };

  return (
    <div style={{ padding: 40, fontFamily: "sans-serif" }}>
      <h1>IMAOS Device Pairing</h1>

      <input
        value={pairCode}
        onChange={(e) => setPairCode(e.target.value)}
        placeholder="Enter pairing code"
        style={{ padding: 10, fontSize: 18 }}
      />

      <button
        onClick={register}
        style={{
          marginLeft: 10,
          padding: "10px 20px",
          fontSize: 18,
        }}
      >
        Pair Device
      </button>

      <div style={{ marginTop: 20 }}>{status}</div>
    </div>
  );
}
