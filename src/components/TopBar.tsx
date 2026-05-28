import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, ChevronDown, LayoutGrid, Sparkles } from "lucide-react";

type Props = {
  title?: string;
  variant?: "default" | "create";
  backTo?: string;
};

export function TopBar({ title = "Assignment", variant = "default", backTo = "/assignments" }: Props) {
  return (
    <header className="flex items-center justify-between gap-4 px-8 py-5">
      <div className="flex items-center gap-3 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-neutral-100 flex-1 max-w-2xl">
        <Link
          to={backTo}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200 hover:bg-neutral-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        {variant === "create" ? (
          <div className="flex items-center gap-2 text-neutral-400">
            <Sparkles className="h-4 w-4 text-orange-400" />
            <span className="text-sm">Create New</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-400">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-sm">{title}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-neutral-200">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 ring-1 ring-neutral-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-sm">
            🧑‍🏫
          </div>
          <span className="text-sm font-medium">Shivam</span>
          <ChevronDown className="h-4 w-4 text-neutral-400" />
        </div>
      </div>
    </header>
  );
}
