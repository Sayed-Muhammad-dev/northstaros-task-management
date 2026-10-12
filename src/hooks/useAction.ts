import { useState } from "react";
import { errorMessage } from "../lib/api";
import { useAppStore } from "./useAppStore";
export function useAction() {
  const { pushToast, busy } = useAppStore();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function run<T>(
    operation: () => Promise<T>,
    success?: string,
  ): Promise<{ ok: true; value: T } | { ok: false }> {
    setPending(true);
    setError("");
    try {
      const value = await operation();
      if (success)
        pushToast({
          title: success,
          description: "Saved to your workspace.",
          tone: "success",
        });
      return { ok: true, value };
    } catch (cause) {
      const message = errorMessage(cause);
      setError(message);
      pushToast({
        title: "Change not completed",
        description: message,
        tone: "warning",
      });
      return { ok: false };
    } finally {
      setPending(false);
    }
  }
  return { run, pending: pending || busy, error, setError };
}
