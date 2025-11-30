"use client";

import { ReactNode } from "react";
import { motion, type HTMLMotionProps, type Transition } from "framer-motion";

type RevealOnScrollProps = Omit<HTMLMotionProps<"div">, "initial" | "whileInView" | "transition" | "viewport"> & {
  children: ReactNode;
  duration?: number;
  delay?: number;
  threshold?: number;
  startY?: number;
  startOpacity?: number;
  startScale?: number;
  easing?: Transition["ease"];
};

export default function RevealOnScroll({
  children,
  className,
  duration = 0.8,
  delay = 0,
  threshold = 0.2,
  startY = 24,
  startOpacity = 0,
  startScale = 1,
  easing = [0.22, 1, 0.36, 1],
  ...rest
}: RevealOnScrollProps) {
  const initialState = { opacity: startOpacity, y: startY, scale: startScale };
  const revealTransition = { duration, delay, ease: easing };

  return (
    <motion.div
      className={className}
      initial={initialState}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: threshold }}
      transition={revealTransition}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
