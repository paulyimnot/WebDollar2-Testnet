import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register Service Worker for Mobile PWA Support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("📱 WebDollar 2 Mobile PWA Active", reg))
      .catch((err) => console.warn("❌ Mobile PWA Registration failed", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
