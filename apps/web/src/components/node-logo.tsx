type NodeLogoProps = {
  className?: string;
};

export function NodeLogo({ className = "h-8 w-8" }: NodeLogoProps) {
  return (
    <span
      className={`relative inline-grid aspect-square shrink-0 place-items-center overflow-hidden ${className}`}
      aria-hidden
    >
      <img
        src="/brand/node_logo_black.svg"
        alt=""
        className="max-h-[88%] max-w-[88%] object-contain dark:hidden"
      />
      <img
        src="/brand/node_logo_white.svg"
        alt=""
        className="hidden max-h-[88%] max-w-[88%] object-contain dark:block"
      />
    </span>
  );
}
