"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportPdfButtonProps {
  targetId: string;
  filename: string;
  label?: string;
}

export function ExportPdfButton({ targetId, filename, label = "Export PDF Report" }: ExportPdfButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function exportPdf() {
    const target = document.getElementById(targetId);
    if (!target || exporting) return;

    setExporting(true);
    try {
      const { default: html2pdf } = await import("html2pdf.js");
      const options = {
          margin: [0.4, 0.4, 0.45, 0.4],
          filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false },
          pagebreak: { mode: ["css", "legacy"], avoid: [".pdf-avoid-break"] },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
        } as never;
      await html2pdf()
        .set(options)
        .from(target)
        .save();
    } finally {
      setExporting(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={() => void exportPdf()} disabled={exporting}>
      {exporting ? <LoaderCircle className="animate-spin" /> : <Download />}
      {exporting ? "Preparing PDF..." : label}
    </Button>
  );
}
