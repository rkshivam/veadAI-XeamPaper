import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import {
  fetchGenerationStatus,
  subscribeToGenerationEvents,
  type GeneratedPaper,
} from "@/lib/generation";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/assignments/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    jobId: typeof search.jobId === "string" ? search.jobId : undefined,
  }),
  component: AssignmentDetail,
});

function AssignmentDetail() {
  const { id } = Route.useParams();
  const { jobId } = Route.useSearch();
  const assignment = useAppStore((s) => s.assignments.find((a) => a.id === id));
  const generationJob = useAppStore((s) => s.generationJobs[id] ?? null);
  const [paper, setPaper] = useState<GeneratedPaper | null>(
    generationJob?.result ?? assignment?.generatedPaper ?? null
  );
  const [isGenerating, setIsGenerating] = useState<boolean>(
    generationJob?.status === "pending" || Boolean(jobId && !paper)
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);

  const assignmentSubject = assignment?.subject ?? "Unknown Subject";
  const assignmentClass = assignment?.className ?? "Unknown Class";
  const assignmentTimeAllowed = assignment?.timeAllowed ?? "N/A";
  const assignmentTitle = assignment?.title ?? "generated-paper";

  useEffect(() => {
    if (generationJob?.result) {
      setPaper(generationJob.result);
      setIsGenerating(false);
      setGenerationError(null);
      return;
    }

    if (generationJob?.status === "failed") {
      setGenerationError(generationJob.error ?? "Question paper generation failed.");
      setIsGenerating(false);
    }
  }, [generationJob]);

  useEffect(() => {
    if (!jobId) return;

    setIsGenerating(true);
    setGenerationError(null);

    return subscribeToGenerationEvents({
      onCompleted: (event) => {
        if (event.jobId !== jobId || !event.paper) return;
        setPaper(event.paper);
        setGenerationError(null);
        setIsGenerating(false);
      },
      onFailed: (event) => {
        if (event.jobId !== jobId) return;
        setGenerationError(event.error ?? "Question paper generation failed.");
        setIsGenerating(false);
      },
    });
  }, [jobId]);

  useEffect(() => {
    if (!jobId || paper) return;

    let cancelled = false;
    const checkStatus = async () => {
      const status = await fetchGenerationStatus(jobId);
      if (cancelled) return;

      if (status.status === "completed") {
        setPaper(status.paper);
        setGenerationError(null);
        setIsGenerating(false);
        return;
      }

      if (status.status === "failed") {
        setGenerationError(status.error ?? "Question paper generation failed.");
        setIsGenerating(false);
      }
    };

    checkStatus().catch((error) => {
      if (cancelled) return;
      setGenerationError(error instanceof Error ? error.message : "Failed to check job status.");
      setIsGenerating(false);
    });

    const timer = window.setInterval(() => {
      checkStatus().catch(() => undefined);
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId, paper]);

  const sections = useMemo(() => paper?.sections ?? [], [paper]);
  const tq = useMemo(
    () => sections.reduce((total, section) => total + section.questions.length, 0),
    [sections]
  );
  const tm = useMemo(
    () =>
      sections.reduce(
        (total, section) =>
          total + section.questions.reduce((sectionTotal, q) => sectionTotal + q.marks, 0),
        0
      ),
    [sections]
  );

  const canDownload = !isGenerating && Boolean(paper);

  const onDownload = async () => {
    if (!paperRef.current || !paper) return;
    const canvas = await html2canvas(paperRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW - 40;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let y = 20;
    pdf.addImage(img, "PNG", 20, y, imgW, imgH);
    heightLeft -= pageH - 40;
    while (heightLeft > 0) {
      pdf.addPage();
      y = 20 - (imgH - heightLeft);
      pdf.addImage(img, "PNG", 20, y, imgW, imgH);
      heightLeft -= pageH - 40;
    }
    pdf.save(`${assignmentTitle.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar variant="create" backTo="/assignments" />
        <main className="px-8 pb-10">
          <div className="overflow-hidden rounded-3xl bg-neutral-900 p-7 text-white shadow-sm">
            <h2 className="text-lg font-bold leading-relaxed">
              {isGenerating ? (
                <>
                  Generating your question paper for {assignmentSubject} ({assignmentClass}
                  )...
                </>
              ) : generationError ? (
                <>Generation failed. Unable to load AI question paper.</>
              ) : paper ? (
                <>Your AI question paper is ready.</>
              ) : (
                <>Waiting for AI question paper...</>
              )}
            </h2>
            {isGenerating ? (
              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium">
                <Loader2 className="h-4 w-4 animate-spin" />
                Waiting for AI generation...
              </div>
            ) : (
              <button
                onClick={onDownload}
                disabled={!canDownload}
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-100"
              >
                <FileDown className="h-4 w-4" />
                Download as PDF
              </button>
            )}
          </div>

          {generationError && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {generationError}
            </div>
          )}

          <div
            ref={paperRef}
            className="mt-6 rounded-3xl bg-white px-12 py-10 text-neutral-900 shadow-sm"
          >
            <h1 className="text-center text-2xl font-bold">
              Anglo Sanskrit, Daryaganj Delhi
            </h1>
            <p className="mt-2 text-center text-lg font-semibold">Subject: {assignmentSubject}</p>
            <p className="text-center text-lg font-semibold">Class: {assignmentClass}</p>

            <div className="mt-6 flex items-center justify-between text-sm">
              <span className="font-semibold">Time Allowed: {assignmentTimeAllowed}</span>
              <span className="font-semibold">Maximum Marks: {tm}</span>
            </div>

            <p className="mt-4 text-sm font-semibold">
              All questions are compulsory unless stated otherwise.
            </p>

            <div className="mt-6 space-y-2 text-sm">
              <div>Name: ____________________</div>
              <div>Roll Number: ____________________</div>
              <div>
                Class: {assignmentClass} Section: ____________
              </div>
            </div>

            {sections.map((section, sIdx) => (
              <div key={sIdx} className="mt-10">
                <h2 className="text-center text-xl font-bold">
                  Section {String.fromCharCode(65 + sIdx)}
                </h2>
                <h3 className="mt-4 text-base font-bold">{section.title}</h3>
                <p className="text-sm italic text-neutral-600">{section.instruction}</p>
                <ol className="mt-3 space-y-3 pl-6 text-sm">
                  {section.questions.map((q, qIdx) => (
                    <li key={`${section.title}-${qIdx}`} className="list-decimal">
                      <DifficultyBadge level={q.difficulty} /> {q.text} [{q.marks} Marks]
                    </li>
                  ))}
                </ol>
              </div>
            ))}

            {!isGenerating && sections.length === 0 && (
              <p className="mt-10 text-sm text-neutral-500">
                No generated sections yet. Generate from the assignment page to populate this paper.
              </p>
            )}

            <p className="mt-10 text-sm font-bold">End of Question Paper</p>
            <p className="mt-2 text-xs text-neutral-400">
              Total Questions: {tq} · Total Marks: {tm}
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

function DifficultyBadge({ level }: { level: string }) {
  const normalized = level.toLowerCase();
  const label =
    normalized === "easy" ? "Easy" : normalized === "hard" ? "Challenging" : "Moderate";
  const styles: Record<string, string> = {
    Easy: "bg-emerald-100 text-emerald-700",
    Moderate: "bg-amber-100 text-amber-700",
    Challenging: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`mr-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${styles[label] ?? "bg-neutral-100"}`}
    >
      {label}
    </span>
  );
}
