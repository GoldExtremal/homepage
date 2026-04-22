export function reportError(context, error) {
  const prefix = "[Start Atlas]";
  if (error instanceof Error) {
    console.warn(`${prefix} ${context}: ${error.message}`);
    return;
  }
  if (error) {
    console.warn(`${prefix} ${context}:`, error);
    return;
  }
  console.warn(`${prefix} ${context}`);
}
