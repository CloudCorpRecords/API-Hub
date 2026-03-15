import { useState } from 'react';
import { CyberButton } from '@/components/CyberButton';
import { CyberInput } from '@/components/CyberInput';
import { useWallet } from '@/hooks/use-wallet';
import { useToast } from '@/hooks/use-toast';
import { useCreateBountyMutation } from '@/hooks/use-bounties';
import { X } from 'lucide-react';

export function ReportIssueModal({ onClose }: { onClose: () => void }) {
  const [floor, setFloor] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState('Medium');
  const { isConnected, walletAddress } = useWallet();
  const { toast } = useToast();
  const createMutation = useCreateBountyMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !walletAddress) {
      toast({ title: "ACCESS DENIED", description: "Log in to report issues.", variant: "destructive" });
      return;
    }
    const title = `[${urgency.toUpperCase()}] Floor ${floor} — ${location || 'General Area'}`;
    const desc = `Floor: ${floor}\nLocation: ${location || 'N/A'}\nUrgency: ${urgency}\n\n${description}`;
    try {
      await createMutation.mutateAsync({
        data: {
          title,
          description: desc,
          rewardAmount: urgency === 'Urgent' ? 50 : urgency === 'Medium' ? 25 : 10,
          category: 'MAINTENANCE',
          creatorWallet: walletAddress,
          rewardToken: 'USDC',
        }
      });
      toast({ title: "ISSUE REPORTED", description: `Maintenance bounty created for Floor ${floor}.` });
      onClose();
    } catch {
      toast({ title: "ERROR", description: "Failed to submit issue.", variant: "destructive" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-md border border-primary/40 bg-card p-6 space-y-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-lg font-display tracking-widest text-primary uppercase">Report Floor Issue</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <CyberInput label="Floor Number" type="number" required value={floor} onChange={e => setFloor(e.target.value)} placeholder="1" />
            <CyberInput label="Room / Location" value={location} onChange={e => setLocation(e.target.value)} placeholder="Kitchen" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-display tracking-widest text-primary uppercase">Description *</label>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 transition-all min-h-[100px]"
              placeholder="Describe the issue..."
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-display tracking-widest text-primary uppercase">Urgency</label>
            <select
              value={urgency}
              onChange={e => setUrgency(e.target.value)}
              className="w-full bg-background/50 border border-border px-4 py-2.5 text-foreground font-sans text-sm focus:outline-none focus:border-primary"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <CyberButton variant="ghost" onClick={onClose} className="text-xs" type="button">CANCEL</CyberButton>
            <CyberButton type="submit" isLoading={createMutation.isPending} className="text-xs">SUBMIT_REPORT</CyberButton>
          </div>
        </form>
      </div>
    </div>
  );
}
