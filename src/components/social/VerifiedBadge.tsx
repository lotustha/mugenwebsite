/** Instagram/Twitter-style verified blue tick. Admin-granted via `User.verified`. */
export default function VerifiedBadge({
  size = 15,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified"
      className={`inline-block shrink-0 align-middle ${className}`}
    >
      <circle cx="12" cy="12" r="11" fill="#3ea6ff" />
      <path
        fill="none"
        stroke="#fff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7 12.5l3.2 3.2L17 9"
      />
    </svg>
  );
}
