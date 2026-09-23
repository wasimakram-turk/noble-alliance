const typeClasses = {
  success: "bg-[#e8f5ed] text-[#39704e]",
  error: "bg-[#fff0e8] text-[#9d4f35]",
  info: "bg-[#ebe7dc] text-[#5f685f]",
};

export default function Notice({
  message,
  children,
  type = "info",
  className = "",
}) {
  const content = message || children;
  if (!content) return null;

  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${typeClasses[type] || typeClasses.info} ${className}`.trim()}
      role={type === "error" ? "alert" : "status"}
    >
      {content}
    </p>
  );
}
