import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  delay?: number;
}

export function CyberCard({ children, className, glow = false, delay = 0 }: CyberCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "relative bg-card border border-border p-6",
        glow && "hover:border-primary/50 transition-colors duration-300",
        className
      )}
    >
      {/* Background texture */}
      <div className="absolute inset-0 bg-[url('/images/cyber-bg.png')] bg-cover bg-center opacity-[0.03] mix-blend-screen pointer-events-none" />
      
      {/* Decorative tech lines */}
      <div className="absolute top-0 right-10 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute bottom-0 left-10 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      {/* Content wrapper to ensure it sits above background */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
