import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CyberButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'accent';
  isLoading?: boolean;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export function CyberButton({ 
  children, 
  variant = 'primary', 
  className, 
  isLoading,
  disabled,
  onClick,
  type,
}: CyberButtonProps) {
  
  const variants = {
    primary: "bg-primary/10 border-primary text-primary hover:bg-primary/20 cyber-glow-hover",
    secondary: "bg-secondary/10 border-secondary text-secondary hover:bg-secondary/20 cyber-glow-accent",
    accent: "bg-accent/20 text-accent border-accent hover:bg-accent/30",
    danger: "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20 shadow-[0_0_15px_rgba(255,0,0,0.2)] hover:shadow-[0_0_25px_rgba(255,0,0,0.4)]",
    ghost: "border-transparent text-muted-foreground hover:text-primary hover:bg-primary/5"
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative px-6 py-2 border font-display tracking-[0.2em] font-bold uppercase transition-all duration-300 overflow-hidden group",
        variants[variant],
        (disabled || isLoading) && "opacity-50 cursor-not-allowed pointer-events-none transform-none",
        className
      )}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
    >
      <div className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-20 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
      
      {/* Cyberpunk corner decorations */}
      {variant !== 'ghost' && (
        <>
          <span className="absolute top-0 left-0 w-2 h-[1px] bg-current" />
          <span className="absolute top-0 left-0 w-[1px] h-2 bg-current" />
          <span className="absolute bottom-0 right-0 w-2 h-[1px] bg-current" />
          <span className="absolute bottom-0 right-0 w-[1px] h-2 bg-current" />
        </>
      )}

      <span className="relative flex items-center justify-center gap-2">
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            PROCESSING...
          </>
        ) : children}
      </span>
    </motion.button>
  );
}
