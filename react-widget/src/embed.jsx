import { createRoot } from "react-dom/client";
import { StatsStrip } from "./StatsStrip.jsx";

function mount() {
  const el = document.getElementById("geo-react-stats");
  if (!el) return;
  createRoot(el).render(<StatsStrip />);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount, { once: true });
} else {
  mount();
}
