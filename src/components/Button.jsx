const variantClasses = {
  primary: "bg-[#142b23] text-white hover:bg-[#25483a]",
  secondary: "bg-[#ebe7dc] text-[#142b23] hover:bg-[#e1dcd0]",
  amber: "bg-[#f0bd4c] text-[#142b23] hover:bg-[#e5aa2f]",
  outline: "border border-[#142b23] text-[#142b23] hover:bg-[#142b23] hover:text-white",
};

const sizeClasses = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3.5 text-sm",
  lg: "px-6 py-3.5 text-sm",
  icon: "h-9 w-9 p-0",
};

export default function Button({
  as,
  href,
  variant = "primary",
  size = "md",
  type = "button",
  loading = false,
  disabled = false,
  className = "",
  children,
  ...props
}) {
  const Component = as || (href ? "a" : "button");
  const isDisabled = disabled || loading;
  const classes = [
    "inline-flex items-center justify-center gap-2 rounded-full font-bold transition disabled:cursor-not-allowed disabled:opacity-60",
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || sizeClasses.md,
    className,
  ].filter(Boolean).join(" ");

  if (Component === "a") {
    return (
      <a
        href={href}
        className={classes}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
}
