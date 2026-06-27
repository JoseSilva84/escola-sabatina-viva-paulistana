import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function ProgressRing({ value = 0, label = "Progresso Geral", size = 190 }) {
  const strokeWidth = 14;
  const radius = (size / 2) - (strokeWidth * 2);
  const circumference = radius * 2 * Math.PI;
  const targetOffset = circumference - (value / 100) * circumference;

  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    // A small delay makes the animation feel better when page loads
    const t = setTimeout(() => setOffset(targetOffset), 100);
    return () => clearTimeout(t);
  }, [targetOffset, circumference]);

  return (
    <div className="relative flex flex-col items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute transform -rotate-90"
        style={{ filter: "drop-shadow(0 4px 6px rgba(244, 194, 31, 0.2))" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#f1e7ba"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#f4c21f"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="flex flex-col items-center justify-center z-10 text-center">
        <strong className="text-[38px] font-bold text-[#0f172a] leading-none mb-1">{value}%</strong>
        <span className="text-[14px] text-[#64748b] max-w-[110px] leading-tight">{label}</span>
      </div>
    </div>
  );
}
