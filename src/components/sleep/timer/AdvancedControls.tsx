"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

/** Animated panel holding the advanced pre-start controls (back-date + environment). */
export function AdvancedControls({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ctrl"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          className="overflow-hidden w-full max-w-[300px] space-y-3"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
