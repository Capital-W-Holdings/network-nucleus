"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch =
          shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatch =
          shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatch =
          shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          event.preventDefault();
          shortcut.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  const shortcuts: KeyboardShortcut[] = [
    {
      key: "i",
      action: () => router.push("/"),
      description: "Go to Import",
    },
    {
      key: "c",
      action: () => router.push("/contacts"),
      description: "Go to Contacts",
    },
    {
      key: "a",
      action: () => router.push("/analytics"),
      description: "Go to Analytics",
    },
    {
      key: "s",
      action: () => router.push("/settings"),
      description: "Go to Settings",
    },
    {
      key: "?",
      shiftKey: true,
      action: () => {
        // Show keyboard shortcuts help
        alert(
          `Keyboard Shortcuts:\n\n` +
            `i - Go to Import\n` +
            `c - Go to Contacts\n` +
            `a - Go to Analytics\n` +
            `s - Go to Settings\n\n` +
            `On Contacts page:\n` +
            `j/k - Navigate up/down\n` +
            `Enter - Open selected contact\n` +
            `/ - Focus search`
        );
      },
      description: "Show keyboard shortcuts",
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

export function useContactsPageShortcuts({
  onNavigateUp,
  onNavigateDown,
  onOpenSelected,
  onFocusSearch,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
}: {
  onNavigateUp: () => void;
  onNavigateDown: () => void;
  onOpenSelected: () => void;
  onFocusSearch: () => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    { key: "j", action: onNavigateDown, description: "Move down" },
    { key: "k", action: onNavigateUp, description: "Move up" },
    { key: "Enter", action: onOpenSelected, description: "Open contact" },
    { key: "/", action: onFocusSearch, description: "Focus search" },
    {
      key: "a",
      ctrlKey: true,
      action: onSelectAll,
      description: "Select all",
    },
    { key: "Escape", action: onClearSelection, description: "Clear selection" },
    {
      key: "Backspace",
      action: onDeleteSelected,
      description: "Delete selected",
    },
  ];

  useKeyboardShortcuts(shortcuts);
}

export function useContactDetailShortcuts({
  onSave,
  onGoBack,
}: {
  onSave: () => void;
  onGoBack: () => void;
}) {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: "s",
      ctrlKey: true,
      action: onSave,
      description: "Save changes",
    },
    {
      key: "s",
      metaKey: true,
      action: onSave,
      description: "Save changes",
    },
    {
      key: "Escape",
      action: onGoBack,
      description: "Go back",
    },
  ];

  useKeyboardShortcuts(shortcuts);
}
