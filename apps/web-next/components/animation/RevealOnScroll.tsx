"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

type Easing = [number, number, number, number] | string;

type RevealOnScrollProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /**
   * Animation duration in seconds (e.g. 0.26 = 260ms).
   */
  duration?: number;
  /**
   * Animation delay in seconds.
   */
  delay?: number;
  /**
   * Intersection ratio required to trigger reveal.
   */
  threshold?: number;
  /**
   * Initial offset on Y axis in pixels (positive = from bottom).
   */
  startY?: number;
  /**
   * Initial opacity before reveal.
   */
  startOpacity?: number;
  /**
   * Initial scale before reveal.
   */
  startScale?: number;
  /**
   * CSS easing function or cubic-bezier tuple.
   */
  easing?: Easing;
};

export default function RevealOnScroll({
  children,
  className,
  duration,
  delay = 0,
  threshold = 0.2,
  startY,
  startOpacity = 0,
  startScale,
  easing,
  style,
  ...rest
}: RevealOnScrollProps) {
  const [hasRevealed, setHasRevealed] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (hasRevealed) {
      return;
    }
    const node = ref.current;
    if (!node) {
      return;
    }
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
      setHasRevealed(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting || entry.intersectionRatio >= threshold) {
            setHasRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [hasRevealed, threshold]);

  const defaultDurationSeconds = 0.26;
  const resolvedDurationSeconds = typeof duration === "number" ? duration : defaultDurationSeconds;
  const durationMs = Math.max(0, resolvedDurationSeconds) * 1000;
  const durationCss =
    typeof duration === "number" ? `${durationMs}ms` : `var(--motion-reveal-duration, ${durationMs}ms)`;

  const easingBase = (() => {
    if (Array.isArray(easing)) {
      return `cubic-bezier(${easing.join(",")})`;
    }
    if (typeof easing === "string") {
      return easing;
    }
    return "cubic-bezier(0.16, 1, 0.3, 1)";
  })();
  const easingCss =
    typeof easing === "undefined" ? `var(--motion-reveal-easing, ${easingBase})` : easingBase;

  const delayMs = Math.max(0, delay) * 1000;

  const resolvedStartScale = typeof startScale === "number" ? startScale : 1;
  const offsetY = (() => {
    if (typeof startY === "number") {
      return `${startY}px`;
    }
    return "var(--motion-reveal-offset-y, 8px)";
  })();

  const baseStyle: CSSProperties = {
    opacity: hasRevealed ? 1 : startOpacity,
    transform: hasRevealed
      ? "translate3d(0, 0, 0) scale(1)"
      : `translate3d(0, ${offsetY}, 0) scale(${resolvedStartScale})`,
    transitionProperty: "opacity, transform",
    transitionTimingFunction: easingCss,
    transitionDuration: durationCss,
    transitionDelay: delayMs ? `${delayMs}ms` : undefined,
    willChange: "opacity, transform",
  };

  return (
    <div ref={ref} className={className} style={{ ...baseStyle, ...style }} {...rest}>
      {children}
    </div>
  );
}
