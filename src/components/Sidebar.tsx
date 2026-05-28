import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid,
  Users,
  FileText,
  BookOpen,
  PieChart,
  Settings,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";

const navItems = [
  { to: "/", label: "Home", icon: LayoutGrid },
  { to: "/groups", label: "My Groups", icon: Users },
  { to: "/assignments", label: "Assignments", icon: FileText, badgeFromCount: true },
  { to: "/toolkit", label: "AI Teacher's Toolkit", icon: BookOpen },
  { to: "/library", label: "My Library", icon: PieChart },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const count = useAppStore((s) => s.assignments.length);

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-6 border-r border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow">
          <span className="font-bold">V</span>
        </div>
        <span className="text-lg font-semibold tracking-tight">VedaAI</span>
      </div>

      <button
        onClick={() => navigate({ to: "/assignments/new" })}
        className="group relative flex items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white shadow-[0_0_0_3px_rgba(251,146,60,0.35)] transition hover:bg-neutral-800"
      >
        <Sparkles className="h-4 w-4 text-orange-400" />
        Create Assignment
      </button>

      <nav className="flex flex-1 flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.to === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-neutral-100 font-semibold text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {item.badgeFromCount && count > 0 && (
                <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-3">
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-orange-300 text-lg">
            🧑‍🏫
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Anglo Sanskrit</div>
            <div className="text-xs text-neutral-500">Daryaganj Delhi</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
