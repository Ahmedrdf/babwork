export function Flash({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state?.error && !state?.ok) return null;
  return <p className={state.error ? 'err' : 'done'}>{state.error || state.ok}</p>;
}
