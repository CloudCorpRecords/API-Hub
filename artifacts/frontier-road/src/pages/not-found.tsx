import { CyberCard } from "@/components/CyberCard";
import { CyberButton } from "@/components/CyberButton";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <CyberCard className="max-w-md w-full text-center border-destructive p-8" glow>
        <div className="text-6xl font-bold text-destructive font-display glitch-text mb-4" data-text="404">
          404
        </div>
        <h2 className="text-xl text-foreground font-display uppercase tracking-widest mb-6">
          SECTOR_NOT_FOUND
        </h2>
        <p className="text-muted-foreground font-sans text-sm mb-8">
          The requested coordinate does not exist within the current OS grid parameters.
        </p>
        <Link href="/">
          <CyberButton variant="ghost" className="border border-border">
            RETURN_TO_BASE
          </CyberButton>
        </Link>
      </CyberCard>
    </div>
  );
}
