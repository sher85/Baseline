"use client";

import { useState } from "react";

type OuraConnectButtonProps = {
  disabled?: boolean;
  mode: "connect" | "reconnect";
};

type ConnectResponse = {
  authorizationUrl?: string;
  error?: string;
  message?: string;
};

function getErrorMessage(payload: ConnectResponse | null, fallback: string) {
  if (!payload) {
    return fallback;
  }

  return payload.message ?? payload.error ?? fallback;
}

export function OuraConnectButton({
  disabled = false,
  mode
}: OuraConnectButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleConnect() {
    if (disabled || isPending) {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/integrations/oura/connect", {
        method: "POST",
        cache: "no-store"
      });
      const payload = (await response.json().catch(() => null)) as ConnectResponse | null;

      if (!response.ok || !payload?.authorizationUrl) {
        setErrorMessage(
          getErrorMessage(payload, "Unable to start the Oura connection flow right now.")
        );
        return;
      }

      window.location.assign(payload.authorizationUrl);
    } catch {
      setErrorMessage("Unable to reach the local API. Make sure the app is still running.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="oura-connect-control">
      <button
        type="button"
        className="page-empty-action primary"
        disabled={disabled || isPending}
        onClick={() => {
          void handleConnect();
        }}
      >
        {isPending ? "Opening Oura..." : mode === "reconnect" ? "Reconnect Oura" : "Connect Oura"}
      </button>
      {errorMessage ? <p className="oura-connect-error">{errorMessage}</p> : null}
    </div>
  );
}
