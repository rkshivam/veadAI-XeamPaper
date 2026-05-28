import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Filter, MoreVertical, Plus, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useAppStore } from "@/lib/store";

export const Route = createFileRoute("/assignments/")({
  component: AssignmentsPage,
});

function AssignmentsPage() {
  const assignments = useAppStore((s) => s.assignments);
  const generationJobs = useAppStore((s) => s.generationJobs);
  const deleteAssignment = useAppStore((s) => s.deleteAssignment);
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  if (assignments.length === 0) {
    return (
      <Layout title="Assignment">
        <EmptyState />
      </Layout>
    );
  }

  return (
    <Layout title="Assignment">
      <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Assignments</h1>
            <p className="text-sm text-neutral-500">
              Manage and create assignments for your classes.
            </p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <button className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-neutral-500 ring-1 ring-neutral-200">
            <Filter className="h-4 w-4" />
            Filter By
          </button>
          <div className="ml-auto flex flex-1 max-w-md items-center gap-2 rounded-full px-4 py-2.5 ring-1 ring-neutral-200">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              placeholder="Search Assignment"
              className="w-full bg-transparent text-sm outline-none placeholder:text-neutral-400"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {assignments.map((a) => (
          <div
            key={a.id}
            className="relative rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div>
                <Link
                  to="/assignments/$id"
                  params={{ id: a.id }}
                  className="text-lg font-bold underline-offset-4 hover:underline"
                >
                  {a.title}
                </Link>
                <div className="mt-2">
                  {a.generatedPaper ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      Generated
                    </span>
                  ) : generationJobs[a.id]?.status === "failed" ? (
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Failed
                    </span>
                  ) : generationJobs[a.id]?.status === "pending" ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
                      Generating...
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                onClick={() => setOpenMenu(openMenu === a.id ? null : a.id)}
                className="rounded-full p-1 hover:bg-neutral-100"
              >
                <MoreVertical className="h-4 w-4 text-neutral-400" />
              </button>
              {openMenu === a.id && (
                <div className="absolute right-4 top-12 z-10 w-44 rounded-xl bg-white p-1 shadow-lg ring-1 ring-neutral-200">
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      navigate({ to: "/assignments/$id", params: { id: a.id } });
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  >
                    View Assignment
                  </button>
                  <button
                    onClick={() => {
                      deleteAssignment(a.id);
                      setOpenMenu(null);
                    }}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <div className="mt-10 flex items-center justify-between text-sm">
              <span>
                <span className="font-semibold">Assigned on</span>
                <span className="text-neutral-500"> : {a.assignedOn}</span>
              </span>
              <span>
                <span className="font-semibold">Due</span>
                <span className="text-neutral-500"> : {a.dueDate}</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
        <button
          onClick={() => navigate({ to: "/assignments/new" })}
          className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-medium text-white shadow-xl hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </button>
      </div>
    </Layout>
  );
}

function EmptyState() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <div className="relative mb-6 flex h-56 w-56 items-center justify-center rounded-full bg-gradient-to-br from-neutral-100 to-neutral-200">
        <div className="absolute -left-2 top-10 text-3xl">✦</div>
        <div className="absolute right-4 top-4 h-10 w-16 rounded bg-white shadow-sm" />
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 shadow-md">
          <div className="h-2 w-20 rounded bg-neutral-800" />
          <div className="h-2 w-24 rounded bg-neutral-200" />
          <div className="h-2 w-20 rounded bg-neutral-200" />
          <div className="text-5xl text-red-500">✕</div>
        </div>
      </div>
      <h2 className="text-xl font-bold">No assignments yet</h2>
      <p className="mt-2 max-w-md text-sm text-neutral-500">
        Create your first assignment to start collecting and grading student submissions.
        You can set up rubrics, define marking criteria, and let AI assist with grading.
      </p>
      <button
        onClick={() => navigate({ to: "/assignments/new" })}
        className="mt-6 flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3.5 text-sm font-medium text-white shadow-lg hover:bg-neutral-800"
      >
        <Plus className="h-4 w-4" />
        Create Your First Assignment
      </button>
    </div>
  );
}
