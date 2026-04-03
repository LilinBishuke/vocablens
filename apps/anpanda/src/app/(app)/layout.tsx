import { TabBar } from "@/components/layout";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex flex-1 flex-col overflow-y-auto">{children}</main>
      <TabBar />
    </div>
  );
}
