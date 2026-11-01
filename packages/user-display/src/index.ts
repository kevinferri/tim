export const DISPLAY_NAME_MAX_LENGTH = 32;

// Seeds User.displayName at sign-up; render sites read displayName directly.
// Google can omit the name, so fall back to the email's local part to never seed a blank one.
export function getInitialDisplayName(
  name: string | null | undefined,
  email: string,
): string {
  const firstName = name?.trim().split(/\s+/)[0];
  return (firstName || email.split("@")[0]).slice(0, DISPLAY_NAME_MAX_LENGTH);
}
