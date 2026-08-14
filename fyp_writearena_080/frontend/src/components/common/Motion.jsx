import React from "react";
import { motion, useReducedMotion } from "framer-motion";

/* ============================================================
   WriteArena — Motion helpers
   Consistent page-entry and stagger animation, with a built-in
   prefers-reduced-motion fallback (no transforms, instant).
   ============================================================ */

/** Wrap a page's content for a gentle fade + rise on entry. */
export function PageMotion({ children, className, style }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      style={style}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/** Container variants that stagger their children in. */
export const staggerContainer = {
  hidden: {},
  show: {
    transition: { delayChildren: 0.1, staggerChildren: 0.08 },
  },
};

/** Child variants paired with staggerContainer. */
export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] } },
};

/** Props for scroll-triggered reveals. */
export const scrollReveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
};
