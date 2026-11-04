/**
 * The app's last line (dl-uukj.69): without it, React 18 unmounts everything on an uncaught render
 * error or a lazy chunk a new release removed, and a child sees a blank page. This shows a short,
 * kind message with a button that reloads, and reports the crash to PostHog, scrubbed.
 */
import { reportError } from "@jadwigo/analytics";
import { copy, type Language } from "@jadwigo/copy";
import { Button, RegisterProvider } from "@jadwigo/ui";
import { Component, type ReactElement, type ReactNode } from "react";

/** The language the page last showed; the boundary sits outside the app that chooses it. */
const pageLanguage = (): Language => (document.documentElement.lang === "en" ? "en" : "pl");

function CrashScreen({ onRetry }: { onRetry: () => void }): ReactElement {
  const language = pageLanguage();
  return (
    <RegisterProvider value="app">
      <main
        role="alert"
        className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center"
      >
        <h1 className="text-2xl font-semibold">{copy(language, "crash_title")}</h1>
        <p>{copy(language, "crash_text")}</p>
        <Button type="button" onClick={onRetry}>
          {copy(language, "crash_retry")}
        </Button>
      </main>
    </RegisterProvider>
  );
}

interface Props {
  children: ReactNode;
  /** Replaced by a test, whose page cannot reload. */
  onRetry?: () => void;
}

export class CrashBoundary extends Component<Props, { crashed: boolean }> {
  override state = { crashed: false };

  static getDerivedStateFromError(): { crashed: boolean } {
    return { crashed: true };
  }

  override componentDidCatch(error: unknown): void {
    reportError(error, "error_boundary");
  }

  override render(): ReactNode {
    if (!this.state.crashed) return this.props.children;
    return <CrashScreen onRetry={this.props.onRetry ?? (() => window.location.reload())} />;
  }
}
