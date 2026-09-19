"use client";

import { useEffect, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportPdfButtonProps {
  targetId: string;
  filename: string;
  label?: string;
}

export function ExportPdfButton({ targetId, filename, label = "Export PDF Report" }: ExportPdfButtonProps) {
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    const finishPrinting = () => {
      document.getElementById(targetId)?.classList.remove("pdf-print-target");
      setPrinting(false);
    };
    window.addEventListener("afterprint", finishPrinting);
    return () => window.removeEventListener("afterprint", finishPrinting);
  }, [targetId]);

  function exportPdf() {
    const target = document.getElementById(targetId);
    if (!target || printing) return;

    void filename;
    target.classList.add("pdf-print-target");
    setPrinting(true);
    window.print();
  }

  return (
    <Button type="button" variant="outline" className="pdf-export-control" onClick={exportPdf} disabled={printing}>
      {printing ? <Printer /> : <Download />}
      {printing ? "Opening print dialog..." : label}
    </Button>
  );
}
