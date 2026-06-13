"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

type UiAlertKind = "success" | "error" | "info";

interface UiAlertInput {
  kind: UiAlertKind;
  title?: string;
  message: string;
  durationMs?: number;
}

interface UiAlert extends UiAlertInput {
  id: string;
}

interface UiFeedbackContextValue {
  setLoadingState: (key: string, isActive: boolean) => void;
  showAlert: (input: UiAlertInput) => void;
}

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null);

/**
 * The app uses one shared feedback layer so every async action can feel
 * consistent instead of each form inventing its own loading and error UI.
 */
export function UiFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [loadingKeys, setLoadingKeys] = useState<string[]>([]);
  const [alerts, setAlerts] = useState<UiAlert[]>([]);
  const dismissTimersRef = useRef<Map<string, number>>(new Map());

  const setLoadingState = useCallback((key: string, isActive: boolean) => {
    setLoadingKeys((currentKeys) => {
      const nextKeys = currentKeys.filter((currentKey) => currentKey !== key);

      if (!isActive) {
        return nextKeys;
      }

      return [...nextKeys, key];
    });
  }, []);

  const dismissAlert = useCallback((alertId: string) => {
    const timeoutId = dismissTimersRef.current.get(alertId);

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      dismissTimersRef.current.delete(alertId);
    }

    setAlerts((currentAlerts) => currentAlerts.filter((alert) => alert.id !== alertId));
  }, []);

  const showAlert = useCallback(
    ({ kind, title, message, durationMs = 4200 }: UiAlertInput) => {
      const alertId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      setAlerts((currentAlerts) => [
        ...currentAlerts,
        {
          id: alertId,
          kind,
          title: title ?? defaultAlertTitleByKind[kind],
          message,
          durationMs,
        },
      ]);

      if (durationMs > 0) {
        const timeoutId = window.setTimeout(() => {
          dismissAlert(alertId);
        }, durationMs);

        dismissTimersRef.current.set(alertId, timeoutId);
      }
    },
    [dismissAlert],
  );

  useEffect(() => {
    return () => {
      for (const timeoutId of dismissTimersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }

      dismissTimersRef.current.clear();
    };
  }, []);

  const contextValue = useMemo(
    () => ({
      setLoadingState,
      showAlert,
    }),
    [setLoadingState, showAlert],
  );

  return (
    <UiFeedbackContext.Provider value={contextValue}>
      {children}
      <GlobalUiLoader isVisible={loadingKeys.length > 0} />
      <UiAlertViewport alerts={alerts} onDismiss={dismissAlert} />
    </UiFeedbackContext.Provider>
  );
}

export function useUiFeedback() {
  const context = useContext(UiFeedbackContext);

  if (!context) {
    throw new Error("useUiFeedback must be used inside UiFeedbackProvider.");
  }

  return context;
}

/**
 * Components opt into the global loader by passing their local pending state.
 * This keeps the action code readable while still driving one shared overlay.
 */
export function useUiLoadingState(isLoading: boolean) {
  const { setLoadingState } = useUiFeedback();
  const loadingKey = useId();

  useEffect(() => {
    setLoadingState(loadingKey, isLoading);

    return () => {
      setLoadingState(loadingKey, false);
    };
  }, [isLoading, loadingKey, setLoadingState]);
}

const defaultAlertTitleByKind: Record<UiAlertKind, string> = {
  success: "Uspješno",
  error: "Došlo je do greške",
  info: "Obavještenje",
};

function GlobalUiLoader({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="ui-loader-overlay" aria-live="polite" aria-busy="true" role="status">
      <div className="ui-loader-card">
        <div className="ui-loader-dots" aria-hidden="true">
          <span className="ui-loader-dot ui-loader-dot--blue" />
          <span className="ui-loader-dot ui-loader-dot--red" />
          <span className="ui-loader-dot ui-loader-dot--yellow" />
        </div>
        <p className="ui-loader-label">Molimo sačekaj...</p>
      </div>
    </div>
  );
}

function UiAlertViewport({
  alerts,
  onDismiss,
}: {
  alerts: UiAlert[];
  onDismiss: (alertId: string) => void;
}) {
  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className="ui-alert-viewport" aria-live="assertive">
      {alerts.map((alert) => (
        <div className={`ui-alert-card ui-alert-card--${alert.kind}`} key={alert.id} role="alert">
          <div className={`ui-alert-icon ui-alert-icon--${alert.kind}`} aria-hidden="true">
            {alert.kind === "success" ? "✓" : alert.kind === "error" ? "!" : "i"}
          </div>

          <div className="min-w-0 flex-1">
            <div className="ui-alert-title">{alert.title}</div>
            <div className="ui-alert-message">{alert.message}</div>
          </div>

          <button
            aria-label="Zatvori poruku"
            className="ui-alert-close"
            onClick={() => onDismiss(alert.id)}
            type="button"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
