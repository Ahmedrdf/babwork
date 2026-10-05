/** Babwork's mark: a studded blue door under an ochre arch. */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg className="logomark" viewBox="0 0 22 26" width={size} height={Math.round((size * 26) / 22)} aria-hidden="true" focusable="false">
      <path d="M1 26V11a10 10 0 0 1 20 0v15z" fill="#d9a441" />
      <path d="M4 26V11.5a7 7 0 0 1 14 0V26z" fill="#1f5fae" />
      <circle cx="11" cy="15" r="1.6" fill="#fff" />
      <circle cx="7.6" cy="12.4" r=".9" fill="#fff" />
      <circle cx="14.4" cy="12.4" r=".9" fill="#fff" />
      <circle cx="7.6" cy="17.4" r=".9" fill="#fff" />
      <circle cx="14.4" cy="17.4" r=".9" fill="#fff" />
      <circle cx="11" cy="20" r=".9" fill="#fff" />
    </svg>
  );
}
