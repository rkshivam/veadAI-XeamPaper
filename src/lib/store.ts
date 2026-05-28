import { create } from "zustand";
import type { GeneratedPaper, GenerationJob } from "@/lib/generation";

export type QuestionRow = {
  id: string;
  type: string;
  count: number;
  marks: number;
};

export type Assignment = {
  id: string;
  title: string;
  assignedOn: string;
  dueDate: string;
  subject: string;
  className: string;
  timeAllowed: string;
  rows: QuestionRow[];
  additionalInfo: string;
  fileName?: string;
  generatedPaper?: GeneratedPaper;
};

type DraftState = {
  fileName?: string;
  dueDate: string;
  title: string;
  subject: string;
  className: string;
  timeAllowed: string;
  rows: QuestionRow[];
  additionalInfo: string;
};

type Store = {
  assignments: Assignment[];
  draft: DraftState;
  generationJobs: Record<string, GenerationJob>;
  setDraft: (patch: Partial<DraftState>) => void;
  addRow: () => void;
  updateRow: (id: string, patch: Partial<QuestionRow>) => void;
  removeRow: (id: string) => void;
  resetDraft: () => void;
  commitDraft: () => Assignment;
  deleteAssignment: (id: string) => void;
  setGenerationJob: (job: GenerationJob) => void;
  resolveGenerationJob: (
    assignmentId: string,
    patch: Pick<GenerationJob, "status" | "result" | "error">,
  ) => void;
  getGeneratedPaper: (assignmentId: string) => GeneratedPaper | undefined;
};

const QUESTION_TYPES = [
  "Multiple Choice Questions",
  "Short Questions",
  "Long Answer Questions",
  "Diagram/Graph-Based Questions",
  "Numerical Problems",
  "True/False",
];

export const questionTypeOptions = QUESTION_TYPES;

const initialDraft = (): DraftState => ({
  title: "Quiz on Electricity",
  subject: "Science",
  className: "8th",
  timeAllowed: "45 minutes",
  dueDate: "",
  rows: [
    { id: crypto.randomUUID(), type: "Multiple Choice Questions", count: 4, marks: 1 },
    { id: crypto.randomUUID(), type: "Short Questions", count: 3, marks: 2 },
    { id: crypto.randomUUID(), type: "Diagram/Graph-Based Questions", count: 5, marks: 5 },
    { id: crypto.randomUUID(), type: "Numerical Problems", count: 5, marks: 5 },
  ],
  additionalInfo: "",
});

const seedAssignments = (): Assignment[] => [
  {
    id: crypto.randomUUID(),
    title: "Quiz on Electricity",
    assignedOn: "20-06-2025",
    dueDate: "25-06-2025",
    subject: "Science",
    className: "8th",
    timeAllowed: "45 minutes",
    rows: [
      { id: crypto.randomUUID(), type: "Multiple Choice Questions", count: 5, marks: 1 },
      { id: crypto.randomUUID(), type: "Short Questions", count: 3, marks: 2 },
      { id: crypto.randomUUID(), type: "Numerical Problems", count: 4, marks: 5 },
    ],
    additionalInfo: "",
    fileName: "electricity-quiz.pdf",
  },
  {
    id: crypto.randomUUID(),
    title: "Forces and Laws of Motion",
    assignedOn: "18-06-2025",
    dueDate: "22-06-2025",
    subject: "Physics",
    className: "9th",
    timeAllowed: "60 minutes",
    rows: [
      { id: crypto.randomUUID(), type: "Multiple Choice Questions", count: 6, marks: 1 },
      { id: crypto.randomUUID(), type: "Long Answer Questions", count: 2, marks: 5 },
      { id: crypto.randomUUID(), type: "Diagram/Graph-Based Questions", count: 3, marks: 4 },
    ],
    additionalInfo: "Focus on Newton's three laws and real-world applications.",
    fileName: "forces-motion.pdf",
  },
];

export const useAppStore = create<Store>((set, get) => ({
  assignments: seedAssignments(),
  draft: initialDraft(),
  generationJobs: {},
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  addRow: () =>
    set((s) => ({
      draft: {
        ...s.draft,
        rows: [
          ...s.draft.rows,
          { id: crypto.randomUUID(), type: "Short Questions", count: 1, marks: 1 },
        ],
      },
    })),
  updateRow: (id, patch) =>
    set((s) => ({
      draft: {
        ...s.draft,
        rows: s.draft.rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      },
    })),
  removeRow: (id) =>
    set((s) => ({ draft: { ...s.draft, rows: s.draft.rows.filter((r) => r.id !== id) } })),
  resetDraft: () => set({ draft: initialDraft() }),
  commitDraft: () => {
    const d = get().draft;
    const today = new Date();
    const fmt = (dt: Date) =>
      `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
    const a: Assignment = {
      id: crypto.randomUUID(),
      title: d.title,
      assignedOn: fmt(today),
      dueDate: d.dueDate || fmt(today),
      subject: d.subject,
      className: d.className,
      timeAllowed: d.timeAllowed,
      rows: d.rows,
      additionalInfo: d.additionalInfo,
      fileName: d.fileName,
    };
    set((s) => ({ assignments: [a, ...s.assignments] }));
    return a;
  },
  deleteAssignment: (id) =>
    set((s) => ({
      assignments: s.assignments.filter((a) => a.id !== id),
      generationJobs: Object.fromEntries(
        Object.entries(s.generationJobs).filter(([, job]) => job.assignmentId !== id),
      ),
    })),
  setGenerationJob: (job) =>
    set((s) => ({
      generationJobs: { ...s.generationJobs, [job.assignmentId]: job },
    })),
  resolveGenerationJob: (assignmentId, patch) =>
    set((s) => {
      const current = s.generationJobs[assignmentId];
      if (!current) return s;
      const nextJob = { ...current, ...patch };
      return {
        assignments: s.assignments.map((assignment) =>
          assignment.id === assignmentId
            ? {
                ...assignment,
                generatedPaper:
                  patch.status === "completed" && patch.result
                    ? patch.result
                    : assignment.generatedPaper,
              }
            : assignment
        ),
        generationJobs: {
          ...s.generationJobs,
          [assignmentId]: nextJob,
        },
      };
    }),
  getGeneratedPaper: (assignmentId) => get().generationJobs[assignmentId]?.result,
}));

export const totalQuestions = (rows: QuestionRow[]) =>
  rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

export const totalMarks = (rows: QuestionRow[]) =>
  rows.reduce((sum, r) => sum + (Number(r.count) || 0) * (Number(r.marks) || 0), 0);
