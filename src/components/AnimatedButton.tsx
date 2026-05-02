"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface AnimatedButtonProps {
  children?: React.ReactNode;
  text?: string;
  href?: string;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

const baseClass = "inline-block px-6 py-3 bg-gradient-to-r from-primary to-primary-dim rounded-md font-headline font-semibold text-surface disabled:opacity-50";

export default function AnimatedButton({
  children,
  text,
  href,
  onClick,
  className = "",
  type = "button",
  disabled,
}: AnimatedButtonProps) {
  const label = children ?? text;

  if (href) {
    return (
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.15 }} className="inline-block">
        <Link href={href} className={`${baseClass} ${className}`}>{label}</Link>
      </motion.div>
    );
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClass} ${className}`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.15 }}
    >
      {label}
    </motion.button>
  );
}
