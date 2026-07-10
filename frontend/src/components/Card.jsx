import { motion } from "framer-motion";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Card({ children, className, onClick, animated = false, delay = 0, hoverable = true, ...props }) {
  const Component = animated ? motion.div : "div";
  
  const animationProps = animated ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay: delay, ease: "easeOut" }
  } : {};

  return (
    <Component
      onClick={onClick}
      className={cn(
        "group border border-white/80 rounded-lg bg-white/85 backdrop-blur-md shadow-[0_10px_30px_rgba(23,58,106,0.04),0_1px_3px_rgba(0,0,0,0.02)] p-4 sm:p-5 lg:p-6 transition-all duration-300 ease-out",
        hoverable && "hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(23,58,106,0.12),0_4px_12px_rgba(0,0,0,0.04)]",
        onClick && "cursor-pointer active:scale-[0.99]",
        className
      )}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  );
}
