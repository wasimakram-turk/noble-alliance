import { useEffect, useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";

import Button from "./Button";
import { ImageReveal } from "./motion";

const ease = [0.22, 0.61, 0.36, 1];

export default function Hero({
  organizationName,
  headline,
  description,
  primaryCtaLabel,
  primaryCtaTarget,
  secondaryCtaLabel,
  secondaryCtaTarget,
  featuredCauseTitle,
  featuredCauseDescription,
  featuredCauseStatus,
  heroImage,
}) {
  const heroRef = useRef(null);
  const reducedMotion = useReducedMotion();
  const shouldReduceMotion = reducedMotion === true;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothPointerX = useSpring(pointerX, { stiffness: 70, damping: 22, mass: 0.8 });
  const smoothPointerY = useSpring(pointerY, { stiffness: 70, damping: 22, mass: 0.8 });
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const contentScrollY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -7]),
    { stiffness: 90, damping: 26, mass: 0.7 },
  );
  const cardScrollX = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, 4]),
    { stiffness: 80, damping: 24, mass: 0.8 },
  );
  const cardScrollY = useSpring(
    useTransform(scrollYProgress, [0, 1], [0, -13]),
    { stiffness: 80, damping: 24, mass: 0.8 },
  );
  const cardX = useTransform(
    [smoothPointerX, cardScrollX],
    ([pointer, scroll]) => pointer + scroll,
  );
  const cardY = useTransform(
    [smoothPointerY, cardScrollY],
    ([pointer, scroll]) => pointer + scroll,
  );
  const headlineLines = headline.split(/\r?\n/);

  useEffect(() => {
    if (!shouldReduceMotion) return;
    pointerX.set(0);
    pointerY.set(0);
  }, [pointerX, pointerY, shouldReduceMotion]);

  function handlePointerMove(event) {
    if (shouldReduceMotion || event.pointerType !== "mouse") return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 10);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * 8);
  }

  function resetPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  const enter = shouldReduceMotion
    ? false
    : {
        opacity: 0,
        y: 15,
      };

  return (
    <section
      ref={heroRef}
      id="top"
      className="relative isolate mx-auto grid max-w-7xl grid-cols-1 gap-x-16 gap-y-10 overflow-x-clip px-6 pb-8 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-y-8 lg:px-12 lg:pb-10 lg:pt-20"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_78%_44%,rgba(220,232,216,0.52),transparent_42%)]"
      />
      <motion.div
        style={{ y: shouldReduceMotion ? 0 : contentScrollY }}
        className="relative z-10"
      >
        <motion.p
          initial={enter}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.62, ease, delay: 0.12 }}
          className="mb-7 flex items-center gap-3 text-[13px] font-semibold tracking-[0.02em] text-[#72500f]"
        >
          <motion.span
            aria-hidden="true"
            initial={shouldReduceMotion ? false : { width: 0 }}
            animate={{ width: 32 }}
            transition={{ duration: 0.55, ease, delay: 0.2 }}
            className="h-px shrink-0 bg-[#b27618]"
          />
          {organizationName} · Mohar Kalan, Abbottabad
        </motion.p>

        <h1
          aria-label={headline.replace(/\s+/g, " ")}
          className="max-w-3xl break-words font-serif text-5xl leading-[0.97] tracking-[-0.04em] text-[#142b23] sm:text-7xl lg:text-[6.7rem]"
        >
          {headlineLines.map((line, index) => (
            <span
              key={`${index}-${line}`}
              className="block overflow-hidden pb-[0.05em] -mb-[0.05em]"
            >
              <motion.span
                aria-hidden="true"
                initial={shouldReduceMotion ? false : { y: "105%" }}
                animate={{ y: "0%" }}
                transition={{
                  duration: 0.78,
                  ease,
                  delay: 0.28 + index * 0.16,
                }}
                className="block"
              >
                {line || "\u00a0"}
              </motion.span>
            </span>
          ))}
        </h1>

        <motion.p
          initial={enter}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease, delay: 0.66 }}
          className="mt-7 max-w-lg text-base leading-7 text-[#5f685f] sm:mt-8 sm:text-lg sm:leading-8"
        >
          {description}
        </motion.p>

        <div className="mt-8 flex flex-wrap items-center gap-3 sm:mt-9">
          <motion.div
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, ease, delay: 0.78 }}
            whileHover={shouldReduceMotion ? undefined : { y: -2 }}
            className="inline-flex"
          >
            <Button
              as="a"
              href={primaryCtaTarget}
              variant="amber"
              size="lg"
              className="group gap-3 transition-shadow hover:shadow-[0_10px_24px_rgba(178,118,24,0.16)]"
            >
              {primaryCtaLabel}
              <ArrowRight
                size={17}
                className="transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
              />
            </Button>
          </motion.div>
          <motion.a
            href={secondaryCtaTarget}
            initial={enter}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.58, ease, delay: 0.88 }}
            whileHover={shouldReduceMotion ? undefined : { y: -1 }}
            className="inline-flex items-center rounded-full border border-[#142b23] px-5 py-3.5 text-sm font-bold text-[#142b23] transition-colors hover:bg-[#142b23] hover:text-white"
          >
            {secondaryCtaLabel}
          </motion.a>
        </div>
      </motion.div>

      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{
          duration: 0.85,
          ease,
          delay: 0.92,
        }}
        className="relative mx-auto w-full max-w-md lg:mb-1"
      >
        <motion.div
          style={shouldReduceMotion ? { x: 0, y: 0 } : { x: cardX, y: cardY }}
          onPointerMove={handlePointerMove}
          onPointerLeave={resetPointer}
          className="relative"
        >
          <div
            aria-hidden="true"
            className="absolute -right-3 -top-3 h-24 w-24 rounded-full border border-[#d8a640]/75"
          />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-[#dce8d8] px-6 pb-7 pt-8 shadow-[0_24px_60px_rgba(20,43,35,0.09)] sm:rounded-[2.5rem] sm:px-8 sm:pb-8 sm:pt-10">
            {heroImage && <div className="group relative mb-7 h-40 overflow-hidden rounded-[1.5rem] bg-[#31573e] sm:h-48">
              <ImageReveal src={heroImage} alt="" width={900} height={540} imgClassName="h-full w-full object-cover object-center" />
              <div aria-hidden="true" className="absolute inset-0 bg-[#142b23]/35" />
            </div>}
            <div
              aria-hidden="true"
              className="absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-[#bed2b8]/70"
            />
            <div className="relative z-10">
              <div className="mb-10 flex items-center justify-between gap-4 text-[#31573e] sm:mb-14">
                <span className="text-sm font-semibold">Mohar Kalan / KPK</span>
                <span className="rounded-full border border-white/80 bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.08em]">
                  {featuredCauseStatus}
                </span>
              </div>
              <p className="mb-3 text-[13px] font-semibold tracking-[0.02em] text-[#31573e]">
                Current community need
              </p>
              <p className="max-w-[18rem] font-serif text-3xl leading-tight text-[#1d4933] sm:text-4xl">
                {featuredCauseTitle}
              </p>
              <p className="mt-5 max-w-sm text-sm leading-6 text-[#31573e]">
                {featuredCauseDescription}
              </p>
              <a
                href={primaryCtaTarget}
                className="group mt-7 inline-flex items-center gap-2 rounded-sm text-sm font-bold text-[#1d4933] underline decoration-[#8da889] underline-offset-4 focus-visible:outline-offset-4 sm:mt-8"
              >
                {primaryCtaLabel}
                <ArrowRight
                  size={15}
                  className="transition-transform duration-200 group-hover:translate-x-1 group-focus-visible:translate-x-1"
                />
              </a>
              <div className="mt-8 flex items-center justify-between border-t border-[#a9c0a4] pt-4 text-xs font-semibold text-[#31573e] sm:mt-10">
                <span>Local needs</span>
                <span>Direct care</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <motion.a
        href="#causes"
        aria-label="Explore our work"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease, delay: 1.05 }}
        className="col-span-full mx-auto inline-flex flex-col items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold tracking-[0.04em] text-[#5f594f] transition-colors hover:text-[#31573e] focus-visible:outline-offset-2"
      >
        <motion.span
          aria-hidden="true"
          initial={shouldReduceMotion ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.48, ease, delay: 1.12 }}
          className="h-6 w-px origin-top bg-[#b27618]"
        />
        <span className="flex items-center gap-1.5">
          Explore our work <ArrowDown size={12} strokeWidth={1.8} />
        </span>
      </motion.a>
    </section>
  );
}
