"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary — only fires if the root layout itself throws,
 * so it must render a complete <html>/<body> (it replaces the root layout
 * entirely, per Next.js's own convention). Deliberately minimal and
 * dependency-free: if the app got here, globals.css/fonts may not have
 * loaded either.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#e6edf7",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: "1rem" }}>Something went wrong — please try again.</p>
          <button
            onClick={() => reset()}
            style={{
              padding: "0.5rem 1rem",
              background: "#f5a623",
              color: "#0b1220",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
