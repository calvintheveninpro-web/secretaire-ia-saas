"use client";

import { useState } from "react";

export function SubscribeButton() {
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    setLoading(true);
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setLoading(false);
  }

  return (
    <button className="btn" onClick={subscribe} disabled={loading} style={{ marginTop: 12 }}>
      {loading ? "Redirection…" : "S'abonner"}
    </button>
  );
}
