export function isDebugAllowed() {
  return process.env.NODE_ENV !== "production";
}

export function getDebugCurrentMatchday() {
  if (!isDebugAllowed()) return null;

  const value = process.env.DEBUG_CURRENT_MATCHDAY;

  if (!value) return null;

  return Number(value);
}

export function getDebugPreviousMatchday() {
  if (!isDebugAllowed()) return null;

  const value = process.env.DEBUG_PREVIOUS_MATCHDAY;

  if (!value) return null;

  return Number(value);
}

export function isDeadlineDisabled() {
  if (!isDebugAllowed()) return false;

  return process.env.NEXT_PUBLIC_DISABLE_DEADLINE === "true";
}

export function getDebugDeadlinePassed() {
  if (!isDebugAllowed()) return null;

  const value = process.env.NEXT_PUBLIC_DEBUG_DEADLINE_PASSED;

  if (value === "true") return true;
  if (value === "false") return false;

  return null;
}