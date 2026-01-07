"use client";

import { Sidebar } from "@/components/sidebar";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";

interface AppShellProps {
  children: React.ReactNode;
  title?: string | React.ReactNode;
  description?: string;
  actions?: React.ReactNode;
}

export function AppShell({
  children,
  title,
  description,
  actions,
}: AppShellProps) {
  useGlobalShortcuts();

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        {(title || actions) && (
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
              <div>
                {title && (
                  <h1 className="text-xl font-semibold tracking-tight">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
