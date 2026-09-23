export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className = "",
}) {
  const alignmentClasses = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  };

  return (
    <div className={`${alignmentClasses[align] || alignmentClasses.left} ${className}`.trim()}>
      {eyebrow && (
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#b27618]">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="font-serif text-5xl leading-none tracking-[-0.03em]">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-6 max-w-sm text-sm leading-6 text-[#6c716a]">
          {description}
        </p>
      )}
    </div>
  );
}
