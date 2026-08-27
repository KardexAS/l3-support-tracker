"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, X, CalendarPlus } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api-client";

interface Engineer {
  id: string;
  fullName: string | null;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Props {
  engineers: Engineer[];
  deprioritizedIds: string[];
}

export function GenerateRotationForm({ engineers, deprioritizedIds }: Props) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [weeks, setWeeks] = useState("12");
  const [loading, setLoading] = useState(false);
  // Live-recomputed de-prioritized IDs based on current form inputs.
  // Falls back to the server-provided initial set (next-12-weeks) until
  // the user picks a start date.
  const [liveDeprioritizedIds, setLiveDeprioritizedIds] =
    useState<string[]>(deprioritizedIds);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!startDate) {
      setLiveDeprioritizedIds(deprioritizedIds);
      return;
    }
    const w = parseInt(weeks, 10);
    if (!Number.isFinite(w) || w < 1 || w > 52) return;

    let cancelled = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { userIds } = await api.schedule.deprioritized(startDate, w);
        if (!cancelled) setLiveDeprioritizedIds(userIds);
      } catch {
        // Silently fall back to the last-known list; the actual generation
        // will re-check server-side anyway.
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, startDate, weeks, deprioritizedIds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!startDate || !weeks) return;

    setLoading(true);
    try {
      const data = await api.schedule.generate({
        startDate,
        weeks: parseInt(weeks),
        engineerIds: engineers.map((e) => e.id),
      });
      toast.success(`Generated ${data.count} schedule entries`);
      setOpen(false);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-9 px-4 py-2 text-sm font-medium hover:bg-primary/90">
          <Plus className="h-4 w-4 mr-2" />
          Generate Rotation
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate On-Call Rotation</DialogTitle>
          <DialogDescription>
            Automatically create a round-robin rotation schedule for {engineers.length} engineers.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (Monday)</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="weeks">Number of Weeks</Label>
            <Input
              id="weeks"
              type="number"
              min="1"
              max="52"
              value={weeks}
              onChange={(e) => setWeeks(e.target.value)}
              required
            />
          </div>
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                This will create a round-robin rotation with the following {engineers.length} engineers:
              </p>
              {previewLoading && <Spinner />}
            </div>
            <ul className="mt-2 text-sm space-y-1 max-h-48 overflow-y-auto">
              {engineers.map((eng) => {
                const isDeprioritized = liveDeprioritizedIds.includes(eng.id);
                return (
                  <li key={eng.id} className="flex items-center gap-2">
                    <span>{eng.fullName ?? eng.name ?? eng.email}</span>
                    {isDeprioritized && (
                      <Badge variant="outline" className="text-xs">
                        De-prioritized
                      </Badge>
                    )}
                  </li>
                );
              })}
            </ul>
            {liveDeprioritizedIds.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                De-prioritized engineers have self-assigned weeks in the selected generation window and will be placed last in the rotation order.
              </p>
            )}
            {!startDate && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                Showing de-prioritized engineers for the next 12 weeks. Pick a start date to preview the actual window.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Spinner /> : <CalendarPlus className="h-4 w-4" />}
              {loading ? "Generating..." : "Generate Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
