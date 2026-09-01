import { CredentialsSignin } from "next-auth";

/**
 * Custom Credentials-provider errors (ui-spec.md §1's three distinct
 * error states). `code` is CredentialsSignin's own documented
 * customization point — set deliberately generic/non-revealing per
 * security-spec.md §10, except where ui-spec.md §1 explicitly calls for a
 * more specific message (the inactive-account case).
 */
export class AccountInactiveError extends CredentialsSignin {
  code = "account-inactive";
}

export class RateLimitedError extends CredentialsSignin {
  code = "rate-limited";
}
