import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react";

/**
 * Motion primitives for Noble Alliance.
 *
 * Design rules used across the site:
 *  - one shared easing curve, so every movement feels like the same hand made it
 *  - things reveal once, never replay on scroll-back (calm = trustworthy)
 *  - every primitive renders its final state when the visitor prefers reduced motion
 */

const ease = [0.22, 0.61, 0.36, 1];
const inView = { once: true, margin: "0px 0px -12% 0px" };

/** Thin amber line under the header that fills as the page is read. */
export function ScrollProgress() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 });

  if (reduce) return null;
  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-[#d49c2e]"
    />
  );
}

/** Soft rise-and-fade. Use for blocks (cards, forms), not for every paragraph. */
export function Reveal({ as = "div", delay = 0, y = 22, className, children, ...rest }) {
  const reduce = useReducedMotion();
  const Component = motion[as] || motion.div;

  return (
    <Component
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={inView}
      transition={{ duration: 0.75, ease, delay }}
      className={className}
      {...rest}
    >
      {children}
    </Component>
  );
}

/** Headline that slides up out of a mask — same language as the hero headline. */
export function MaskReveal({ as: Tag = "h2", delay = 0, className, children }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // Observe the (unclipped) mask, not the moving text: IntersectionObserver ignores
  // content that is clipped away by an ancestor's overflow, so it would never fire.
  const seen = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });

  return (
    <Tag className={className}>
      <span ref={ref} className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
        <motion.span
          className="block"
          initial={reduce ? false : { y: "108%" }}
          animate={{ y: seen || reduce ? "0%" : "108%" }}
          transition={{ duration: 0.9, ease, delay }}
        >
          {children}
        </motion.span>
      </span>
    </Tag>
  );
}

function Word({ word, progress, range }) {
  const opacity = useTransform(progress, range, [0.18, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}
    </motion.span>
  );
}

/** Paragraph whose words light up one by one as the visitor scrolls through it. */
export function ScrollWords({ text, className }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.9", "end 0.6"],
  });
  const words = String(text || "").split(/\s+/).filter(Boolean);

  if (reduce) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, index) => {
          const start = index / words.length;
          const end = Math.min(start + 1.6 / words.length, 1);
          return (
            <span key={`${word}-${index}`}>
              <Word word={word} progress={scrollYProgress} range={[start, end]} />{" "}
            </span>
          );
        })}
      </span>
    </p>
  );
}

/** Number that counts up once it scrolls into view. Non-numeric values render as-is. */
export function CountUp({ value, format, duration = 1.6 }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const seen = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const text = String(value ?? "").trim();
  const numeric = Number(text);
  const isNumber = text !== "" && Number.isFinite(numeric);
  const formatter = format || ((n) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n));

  const count = useMotionValue(0);
  const display = useTransform(count, (latest) => formatter(Math.round(latest)));

  useEffect(() => {
    if (!seen || !isNumber) return undefined;
    if (reduce) {
      count.set(numeric);
      return undefined;
    }
    const controls = animate(count, numeric, { duration, ease });
    return () => controls.stop();
    // formatter is intentionally excluded; it only changes identity between renders
  }, [seen, isNumber, numeric, reduce, duration, count]);

  if (!isNumber) return <span>{value}</span>;
  return <motion.span ref={ref}>{display}</motion.span>;
}

/** Progress bar that fills from empty when it scrolls into view. */
export function AnimatedBar({ percent, className = "" }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { width: 0 }}
      whileInView={{ width: `${percent}%` }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.3, ease, delay: 0.25 }}
      className={`h-full rounded-full bg-[#d49c2e] ${className}`}
      style={reduce ? { width: `${percent}%` } : undefined}
    />
  );
}

/**
 * Image that is unveiled by a clip-path wipe, settles from a slight zoom,
 * and (optionally) drifts with scroll. Fills its positioned parent.
 */
export function ImageReveal({
  src,
  alt = "",
  width,
  height,
  delay = 0,
  parallax = false,
  imgClassName = "h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105",
}) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  // Start loading shortly before the image nears the viewport. Native loading="lazy"
  // can stall inside a clipped/transformed wrapper, so this is explicit instead.
  const near = useInView(ref, { once: true, margin: "500px 0px 500px 0px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], ["-7%", "7%"]);
  const still = reduce || !parallax;

  return (
    <motion.div
      ref={ref}
      className="absolute inset-0"
      initial={reduce ? false : { clipPath: "inset(0 0 100% 0)" }}
      whileInView={{ clipPath: "inset(0 0 0% 0)" }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 1.1, ease, delay }}
    >
      <motion.div
        className={still ? "absolute inset-0" : "absolute inset-x-0 -inset-y-[9%]"}
        style={still ? undefined : { y: drift }}
      >
        <motion.div
          className="h-full w-full"
          initial={reduce ? false : { scale: 1.18 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: "0px 0px -8% 0px" }}
          transition={{ duration: 1.5, ease, delay }}
        >
          <img
            src={near ? src : undefined}
            alt={alt}
            width={width}
            height={height}
            decoding="async"
            className={imgClassName}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function Step({ step, index, total, progress, reduce }) {
  const reach = index === total - 1 ? "0px" : "-1.25rem";
  const segment = useTransform(progress, [index / total, (index + 1) / total], [0, 1]);
  const lit = useTransform(segment, [0, 0.08], [0, 1]);
  const dotColor = useTransform(lit, [0, 1], ["#d9d4c9", "#b27618"]);
  const dotScale = useTransform(lit, [0, 1], [0.7, 1]);
  const numberColor = useTransform(lit, [0, 1], ["#c9c1b2", "#b27618"]);

  return (
    <Reveal delay={index * 0.12} className="relative">
      <div aria-hidden="true" className="relative mb-6 hidden h-3 sm:block">
        <span style={{ right: reach }} className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-[#e5e0d5]" />
        <motion.span
          style={{ scaleX: reduce ? 1 : segment, right: reach }}
          className="absolute left-0 top-1/2 h-px origin-left -translate-y-1/2 bg-[#b27618]"
        />
        <motion.span
          style={reduce ? { backgroundColor: "#b27618" } : { backgroundColor: dotColor, scale: dotScale }}
          className="absolute left-0 top-1/2 block h-3 w-3 -translate-y-1/2 rounded-full ring-4 ring-[#f8f6f0]"
        />
      </div>
      <div className="rounded-2xl border border-[#e5e0d5] bg-white/55 p-4">
        <motion.span
          style={reduce ? { color: "#b27618" } : { color: numberColor }}
          className="num font-serif text-3xl"
        >
          {String(index + 1).padStart(2, "0")}
        </motion.span>
        <h3 className="mt-5 font-serif text-2xl">{step.title}</h3>
        <p className="mt-3 text-sm leading-6 text-[#6c716a]">{step.description}</p>
      </div>
    </Reveal>
  );
}

/** The "how it works" sequence: a line draws through the steps as you scroll. */
export function StepsTrack({ steps }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "end 0.55"] });
  const progress = useSpring(scrollYProgress, { stiffness: 110, damping: 30, mass: 0.5 });

  return (
    <div ref={ref} className="grid gap-5 sm:grid-cols-3">
      {steps.map((step, index) => (
        <Step
          key={step.id}
          step={step}
          index={index}
          total={steps.length}
          progress={progress}
          reduce={reduce === true}
        />
      ))}
    </div>
  );
}
