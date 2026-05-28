import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Minus, Plus, Upload, Calendar, Mic, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Layout } from "@/components/Layout";
import { queuePaperGeneration } from "@/lib/generation";
import {
  questionTypeOptions,
  totalMarks,
  totalQuestions,
  useAppStore,
} from "@/lib/store";

export const Route = createFileRoute("/assignments/new")({
  component: NewAssignmentPage,
});

type Draft = ReturnType<typeof useAppStore.getState>["draft"];

function NewAssignmentPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const draft = useAppStore((s) => s.draft);
  const setDraft = useAppStore((s) => s.setDraft);
  const addRow = useAppStore((s) => s.addRow);
  const updateRow = useAppStore((s) => s.updateRow);
  const removeRow = useAppStore((s) => s.removeRow);
  const commit = useAppStore((s) => s.commitDraft);
  const setGenerationJob = useAppStore((s) => s.setGenerationJob);

  const onPublish = async () => {
    setIsGenerating(true);
    try {
      const assignment = commit();
      const { jobId } = await queuePaperGeneration(assignment);
      setGenerationJob({
        jobId,
        assignmentId: assignment.id,
        status: "pending",
      });
      navigate({
        to: "/assignments/$id",
        params: { id: assignment.id },
        search: { jobId },
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Layout title="Assignment" topVariant="default">
      <div className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <span className="mt-2 h-3 w-3 rounded-full bg-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold">Create Assignment</h1>
            <p className="text-sm text-neutral-500">Set up a new assignment for your students</p>
          </div>
        </div>

        <div className="my-6 flex gap-2">
          <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-neutral-900" : "bg-neutral-200"}`} />
          <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-neutral-900" : "bg-neutral-200"}`} />
        </div>

        {step === 1 ? (
          <StepOne draft={draft} setDraft={setDraft} />
        ) : (
          <StepTwo
            draft={draft}
            setDraft={setDraft}
            updateRow={updateRow}
            removeRow={removeRow}
            addRow={addRow}
          />
        )}

        <div className="mt-10 flex items-center justify-between">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium ring-1 ring-neutral-200 hover:bg-neutral-50"
            >
              ← Previous
            </button>
          ) : (
            <span />
          )}
          {step === 1 ? (
            <button
              onClick={() => setStep(2)}
              className="ml-auto flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={onPublish}
              disabled={isGenerating}
              className="ml-auto flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  Generate <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StepOne({
  draft,
  setDraft,
}: {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-bold">Assignment Details</h2>
      <p className="text-sm text-neutral-500">Basic information about your assignment</p>

      <label className="mt-6 block cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-white p-10 text-center transition hover:border-neutral-400">
        <input
          type="file"
          className="hidden"
          accept="image/png,image/jpeg"
          onChange={(e) => setDraft({ fileName: e.target.files?.[0]?.name })}
        />
        <Upload className="mx-auto h-7 w-7 text-neutral-400" />
        <div className="mt-3 font-semibold">
          {draft.fileName ?? "Choose a file or drag & drop it here"}
        </div>
        <div className="mt-1 text-xs text-neutral-400">JPEG, PNG, upto 10MB</div>
        <span className="mt-4 inline-block rounded-full bg-white px-4 py-2 text-sm ring-1 ring-neutral-200">
          Browse Files
        </span>
      </label>
      <p className="mt-2 text-center text-xs text-neutral-400">
        Upload images of your preferred document/image
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Title">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            className="w-full rounded-full bg-white px-5 py-3 text-sm ring-1 ring-neutral-200 outline-none focus:ring-neutral-400"
          />
        </Field>
        <Field label="Due Date">
          <div className="relative">
            <input
              type="date"
              value={draft.dueDate}
              onChange={(e) => setDraft({ dueDate: e.target.value })}
              placeholder="DD-MM-YYYY"
              className="w-full rounded-full bg-white px-5 py-3 text-sm ring-1 ring-neutral-200 outline-none focus:ring-neutral-400"
            />
            <Calendar className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          </div>
        </Field>
        <Field label="Subject">
          <input
            value={draft.subject}
            onChange={(e) => setDraft({ subject: e.target.value })}
            className="w-full rounded-full bg-white px-5 py-3 text-sm ring-1 ring-neutral-200 outline-none focus:ring-neutral-400"
          />
        </Field>
        <Field label="Class">
          <input
            value={draft.className}
            onChange={(e) => setDraft({ className: e.target.value })}
            className="w-full rounded-full bg-white px-5 py-3 text-sm ring-1 ring-neutral-200 outline-none focus:ring-neutral-400"
          />
        </Field>
      </div>
    </div>
  );
}

function StepTwo({
  draft,
  setDraft,
  updateRow,
  removeRow,
  addRow,
}: {
  draft: Draft;
  setDraft: (patch: Partial<Draft>) => void;
  updateRow: (id: string, patch: Partial<Draft["rows"][number]>) => void;
  removeRow: (id: string) => void;
  addRow: () => void;
}) {
  const tq = totalQuestions(draft.rows);
  const tm = totalMarks(draft.rows);

  return (
    <div>
      <div className="grid grid-cols-12 items-center gap-4 px-2 pb-3 text-sm font-bold">
        <div className="col-span-6">Question Type</div>
        <div className="col-span-3 text-center">No. of Questions</div>
        <div className="col-span-3 text-center">Marks</div>
      </div>

      <div className="space-y-3">
        {draft.rows.map((row) => (
          <div key={row.id} className="grid grid-cols-12 items-center gap-4">
            <div className="col-span-6 relative">
              <select
                value={row.type}
                onChange={(e) => updateRow(row.id, { type: e.target.value })}
                className="w-full appearance-none rounded-full bg-white px-5 py-3 pr-10 text-sm ring-1 ring-neutral-200 outline-none focus:ring-neutral-400"
              >
                {questionTypeOptions.map((opt) => (
                  <option key={opt}>{opt}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            </div>
            <div className="col-span-1 text-center text-neutral-300">×</div>
            <NumberInput
              value={row.count}
              onChange={(v) => updateRow(row.id, { count: v })}
              className="col-span-2"
            />
            <NumberInput
              value={row.marks}
              onChange={(v) => updateRow(row.id, { marks: v })}
              className="col-span-2"
            />
            <button
              onClick={() => removeRow(row.id)}
              className="col-span-1 text-xs text-neutral-400 hover:text-red-500"
              title="Remove"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addRow}
        className="mt-5 flex items-center gap-2 text-sm font-bold"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white">
          <Plus className="h-4 w-4" />
        </span>
        Add Question Type
      </button>

      <div className="mt-6 text-right text-sm">
        <div className="font-bold">
          Total Questions : <span className="ml-1">{tq}</span>
        </div>
        <div className="mt-1 font-bold">
          Total Marks : <span className="ml-1">{tm}</span>
        </div>
      </div>

      <div className="mt-8">
        <label className="block text-sm font-bold">
          Additional Information (For better output)
        </label>
        <div className="relative mt-2">
          <textarea
            value={draft.additionalInfo}
            onChange={(e) => setDraft({ additionalInfo: e.target.value })}
            rows={4}
            placeholder="e.g Generate a question paper for 3 hour exam duration..."
            className="w-full rounded-2xl border border-dashed border-neutral-300 bg-white p-5 text-sm outline-none focus:border-neutral-400"
          />
          <Mic className="absolute bottom-4 right-4 h-4 w-4 text-neutral-400" />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  className = "",
}: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-full bg-white px-3 py-2 ring-1 ring-neutral-200 ${className}`}
    >
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-12 bg-transparent text-center text-sm outline-none"
      />
      <button
        onClick={() => onChange(value + 1)}
        className="flex h-6 w-6 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
