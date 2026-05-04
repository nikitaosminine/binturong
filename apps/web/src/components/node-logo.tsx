type NodeLogoProps = {
  className?: string;
};

export function NodeLogo({ className = "h-8 w-8" }: NodeLogoProps) {
  return (
    <span className={`relative inline-grid shrink-0 place-items-center ${className}`} aria-hidden>
      <img
        src="/brand/node_logo_black.svg"
        alt=""
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src="/brand/node_logo_white.svg"
        alt=""
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}
