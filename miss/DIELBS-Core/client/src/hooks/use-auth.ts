// localStorage-backed auth hook for decentralized DIELBS UI.
// No Express backend required — accounts stored in browser localStorage.

import { useLocation } from "wouter";
import { useState, useEffect } from "react";

function getCurrentUser(): { username: string } | null {
  try {
    const raw = localStorage.getItem("webd2_current_user");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function useAuth() {
  const [_, setLocation] = useLocation();
  const [stored, setStored] = useState(() => getCurrentUser());

  useEffect(() => {
    const handleStorage = () => setStored(getCurrentUser());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const user = stored ? {
    id: 1,
    username: stored.username,
    isDev: false,
  } : null;

  return {
    user,
    isLoadingUser: false,
    login: () => { },
    register: () => { },
    logout: () => {
      localStorage.removeItem("webd2_current_user");
      window.dispatchEvent(new Event("storage"));
      setLocation("/");
    },
    verify2FA: () => { },
    isLoggingIn: false,
    isRegistering: false,
    isVerifying2FA: false,
    pending2FA: null,
    cancelPending2FA: () => { },
  };
}
