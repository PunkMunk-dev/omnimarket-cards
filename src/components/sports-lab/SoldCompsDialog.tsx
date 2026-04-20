import { ExternalLink, Calendar, DollarSign, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Psa10SoldComp } from '@/types/sportsEbay';

interface SoldCompsDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; soldComps: Psa10SoldComp[];
  marketValue: number | null; confidence: 'high' | 'medium' | 'low' | null;
}

function formatDate(d: string | null): string {
  if (!d) return 'Unknown';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch { return 'Unknown'; }
}

export function SoldCompsDialog({ open, onOpenChange, soldComps, marketValue, confidence }: SoldCompsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: 'var(--om-bg-1)',
          border: '1px solid var(--om-border-1)',
          borderRadius: '1rem',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}
          >
            PSA-10 Sold Comps
            {confidence === 'high' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(46,229,157,0.12)', color: 'var(--om-success)', border: '1px solid rgba(46,229,157,0.25)' }}>
                High Confidence
              </span>
            )}
            {confidence === 'medium' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'var(--om-bg-3)', color: 'var(--om-text-2)', border: '1px solid var(--om-border-0)' }}>
                Medium
              </span>
            )}
            {confidence === 'low' && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(255,204,102,0.10)', color: 'var(--om-warning)', border: '1px solid rgba(255,204,102,0.25)' }}>
                <AlertTriangle className="h-3 w-3" />Low
              </span>
            )}
          </DialogTitle>
          <DialogDescription style={{ color: 'var(--om-text-3)' }}>
            {soldComps.length} recent sale{soldComps.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {marketValue !== null && (
          <div className="rounded-xl p-4" style={{ background: 'var(--om-bg-3)', border: '1px solid var(--om-border-0)' }}>
            <div className="text-xs mb-1.5" style={{ color: 'var(--om-text-3)' }}>Market Value (Guide)</div>
            <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--om-text-0)', fontFamily: "'Space Grotesk', sans-serif" }}>
              ${marketValue.toFixed(2)}
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[300px]">
          <div className="space-y-2 pr-1">
            {soldComps.map((comp, i) => (
              <a
                key={`${comp.ebayUrl}-${i}`}
                href={comp.ebayUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 p-3 rounded-xl transition-colors group om-btn"
                style={{ background: 'var(--om-bg-2)', border: '1px solid var(--om-border-0)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--om-border-1)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--om-border-0)')}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug line-clamp-2" style={{ color: 'var(--om-text-1)' }}>
                    {comp.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: 'var(--om-text-3)' }}>
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span className="font-semibold tabular-nums" style={{ color: 'var(--om-text-0)' }}>${comp.price.toFixed(2)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(comp.soldDate)}
                    </span>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 mt-0.5 transition-colors"
                  style={{ color: 'var(--om-text-3)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--om-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--om-text-3)')} />
              </a>
            ))}
          </div>
        </ScrollArea>

        {soldComps.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: 'var(--om-text-2)' }}>
            No sold comps available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
