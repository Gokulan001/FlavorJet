"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { Children } from "react";

interface StaggerChildrenProps {
  children: ReactNode;
  staggerDelay?: number;
  className?: string;
}

const containerVariants = {
  hidden: {},
  visible: (staggerDelay: number) => ({
    transition: {
      staggerChildren: staggerDelay,
    },
  }),
};

const childVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0, 0, 0.58, 1] as const, // easeOut cubic-bezier
    },
  },
};

export default function StaggerChildren({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerChildrenProps) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      custom={staggerDelay}
      className={className}
    >
      {Children.map(children, (child) => (
        <motion.div variants={childVariants} className="h-full">{child}</motion.div>
      ))}
    </motion.div>
  );
}
