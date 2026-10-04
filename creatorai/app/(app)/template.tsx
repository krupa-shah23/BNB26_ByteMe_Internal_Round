"use client";
import { motion } from "framer-motion";

/** Route transition: quick fade on every navigation (transform/opacity only). */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div className="h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}
