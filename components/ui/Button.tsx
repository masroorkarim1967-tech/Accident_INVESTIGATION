import { type ButtonHTMLAttributes } from "react";

/**
 * Shared Button primitive (ui-spec.md §4): PrimaryButton (solid amber),
 * SecondaryButton (teal outline), GhostButton/TextLink (tertiary),
 * DestructiveButton (red outline — always pair with a ConfirmDialog,
 * added when the first destructive action needs one).
 */
type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  // bg-amber-fill (not bg-amber, now darkened for AA text contrast — see
  // globals.css) + fixed dark text (not the theme-dependent
  // `text-background`, which is near-white in light theme) — a solid
  // amber fill needs to stay bright with dark text in both themes
  // (testing-spec.md TS-046/TS-048).
  primary: "bg-amber-fill text-[#0b1220] border border-amber-fill hover:bg-amber-muted",
  secondary: "bg-transparent text-teal border border-teal hover:bg-teal/10",
  ghost: "bg-transparent text-muted border border-transparent hover:text-foreground",
  destructive: "bg-transparent text-red border border-red hover:bg-red/10",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded px-4 py-2 font-sans text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
