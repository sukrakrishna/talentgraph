import { Suspense } from "react";
import { AssistantClient } from "@/components/assistant-client";

export default function AssistantPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-6 py-8 text-sm text-muted-foreground">Loading assistant...</div>}>
      <AssistantClient />
    </Suspense>
  );
}
