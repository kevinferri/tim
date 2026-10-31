// Seeds User.displayName at sign-up; render sites read displayName directly.
export function getFirstName(name?: string | null): string {
  return name?.split(" ")[0] ?? "";
}

export const DISPLAY_NAME_MAX_LENGTH = 32;
