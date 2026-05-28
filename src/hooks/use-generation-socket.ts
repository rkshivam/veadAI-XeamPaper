import { useEffect } from "react";
import { subscribeToGenerationEvents } from "@/lib/generation";
import { useAppStore } from "@/lib/store";

export function useGenerationSocket() {
  const resolveGenerationJob = useAppStore((s) => s.resolveGenerationJob);

  useEffect(() => {
    return subscribeToGenerationEvents({
      onCompleted: (event) => {
        if (!event.assignmentId) return;
        resolveGenerationJob(event.assignmentId, {
          status: "completed",
          result: event.paper ?? undefined,
        });
      },
      onFailed: (event) => {
        if (!event.assignmentId) return;
        resolveGenerationJob(event.assignmentId, {
          status: "failed",
          error: event.error ?? "Question paper generation failed.",
        });
      },
    });
  }, [resolveGenerationJob]);
}
