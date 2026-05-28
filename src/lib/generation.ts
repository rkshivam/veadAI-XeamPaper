import { io, type Socket } from "socket.io-client";
import type { Assignment } from "@/lib/store";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export type GeneratedQuestion = {
  text: string;
  difficulty: string;
  marks: number;
};

export type GeneratedSection = {
  title: string;
  instruction: string;
  questions: GeneratedQuestion[];
};

export type GeneratedPaper = {
  sections: GeneratedSection[];
};

export type JobCompletedEvent = {
  jobId: string;
  assignmentId: string | null;
  paper: GeneratedPaper | null;
};

export type JobFailedEvent = {
  jobId: string;
  assignmentId: string | null;
  error?: string;
};

export type GenerationJob = {
  jobId: string;
  assignmentId: string;
  status: "pending" | "completed" | "failed";
  result?: GeneratedPaper;
  error?: string;
};

let socket: Socket | null = null;

export function getSocket() {
  if (!socket) {
    socket = io(API_URL, {
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function assignmentToPayload(assignment: Assignment) {
  return {
    assignmentId: assignment.id,
    assignmentTitle: assignment.title,
    subject: assignment.subject,
    className: assignment.className,
    timeAllowed: assignment.timeAllowed,
    topic: assignment.additionalInfo.trim() || assignment.title,
    rows: assignment.rows.map(({ type, count, marks }) => ({ type, count, marks })),
    difficulty: "medium" as const,
    instructions: assignment.additionalInfo
      ? [assignment.additionalInfo]
      : ["All questions are compulsory unless stated otherwise."],
  };
}

export async function queuePaperGeneration(assignment: Assignment) {
  const response = await fetch(`${API_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(assignmentToPayload(assignment)),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Failed to queue question paper generation.");
  }

  return (await response.json()) as { jobId: string; queue: string; message: string };
}

export async function fetchGenerationStatus(jobId: string) {
  const response = await fetch(`${API_URL}/api/generate/${jobId}`);
  if (!response.ok) {
    throw new Error("Failed to fetch generation status.");
  }

  return (await response.json()) as
    | { status: "pending" }
    | { status: "completed"; paper: GeneratedPaper }
    | { status: "failed"; error?: string }
    | { status: "not_found"; message: string };
}

export function subscribeToGenerationEvents(handlers: {
  onCompleted: (event: JobCompletedEvent) => void;
  onFailed: (event: JobFailedEvent) => void;
}) {
  const client = getSocket();
  client.on("JOB_COMPLETED", handlers.onCompleted);
  client.on("JOB_FAILED", handlers.onFailed);
  return () => {
    client.off("JOB_COMPLETED", handlers.onCompleted);
    client.off("JOB_FAILED", handlers.onFailed);
  };
}
