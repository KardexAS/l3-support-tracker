"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Calendar, Download } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { api, ApiError } from "@/lib/api-client";

export function CalendarExport() {
  const [downloading, setDownloading] = useState(false);

  async function downloadIcs() {
    setDownloading(true);
    try {
      await api.schedule.downloadIcs();
      toast.success("Calendar downloaded. Import oncall-schedule.ics in Outlook.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "An error occurred");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Export Calendar
        </CardTitle>
        <CardDescription>
          Download the on-call schedule as an .ics file and import it into Outlook
          (or any calendar app). Re-download to pick up schedule changes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="sm" onClick={downloadIcs} disabled={downloading}>
          {downloading ? <Spinner /> : <Download className="h-4 w-4" />}
          {downloading ? "Preparing..." : "Download .ics"}
        </Button>
      </CardContent>
    </Card>
  );
}
