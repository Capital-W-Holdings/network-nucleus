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
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
        {(title || actions) && (
          <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex min-h-14 items-center justify-between px-4 py-2 lg:px-6 lg:h-16">
              <div className="min-w-0 flex-1">
                {title && (
                  <h1 className="text-lg lg:text-xl font-semibold tracking-tight truncate">
                    {title}
                  </h1>
                )}
                {description && (
                  <p className="text-xs lg:text-sm text-muted-foreground truncate">{description}</p>
                )}
              </div>
              {actions && <div className="flex items-center gap-2 ml-2 flex-shrink-0">{actions}</div>}
            </div>
          </div>
        )}
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
