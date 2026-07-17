"use client";
import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: GoogleCredentialResponse) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export function GoogleSignInButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const router = useRouter();
  const { refresh } = useAuth();
  const btnRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);

  async function handleCredential(response: GoogleCredentialResponse) {
    setError("");

    const send = async (coords?: { latitude: number; longitude: number }) => {
      const res = await fetch("/api/auth/google", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: response.credential, ...coords }),
      });
      const data = await res.json().catch(() => ({ error: "Error de conexión" }));
      if (!res.ok) { setError(data.error ?? "No se pudo iniciar sesión con Google"); return; }
      await refresh();
      router.push("/");
    };

    if (!navigator.geolocation) { await send(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => send({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => send(),
      { timeout: 8000 }
    );
  }

  useEffect(() => {
    if (!scriptReady || !clientId || !btnRef.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
    window.google.accounts.id.renderButton(btnRef.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptReady, clientId]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setScriptReady(true)} />
      <div ref={btnRef} />
      {error && <p className="text-rose-500 text-xs text-center">{error}</p>}
    </div>
  );
}
