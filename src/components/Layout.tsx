import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

type Props = {
  children: ReactNode;
  title?: string;
  topVariant?: "default" | "create";
};

export function Layout({ children, title, topVariant }: Props) {
  return (
    <div className="flex min-h-screen bg-neutral-100">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <TopBar title={title} variant={topVariant} />
        <main className="flex-1 px-8 pb-10">{children}</main>
      </div>
    </div>
  );
}
