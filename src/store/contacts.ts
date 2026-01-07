import { create } from "zustand";
import { Contact, ContactStatus, ExtractedContact } from "@/types";
import {
  getAllContacts,
  addContacts,
  updateContact as dbUpdateContact,
  deleteContact as dbDeleteContact,
  deleteContacts as dbDeleteContacts,
  checkDuplicates,
  logContactUpdate,
  logContactCreated,
} from "@/lib/db";
import { analyzeContext, formatRawContext } from "@/lib/parser/context";
import { parseNameFromLinkedInUrl } from "@/lib/parser/extractors";
import { v4 as uuidv4 } from "uuid";

interface ContactsState {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  filters: {
    status: ContactStatus | "all";
    sharedBy: string | "all";
    urgency: string | "all";
    search: string;
  };

  // Actions
  loadContacts: () => Promise<void>;
  importContacts: (
    extracted: ExtractedContact[]
  ) => Promise<{ added: number; duplicates: number }>;
  updateContact: (
    id: string,
    updates: Partial<Contact>,
    logChange?: boolean
  ) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  setSelectedIds: (ids: Set<string>) => void;
  toggleSelected: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setFilter: (
    key: keyof ContactsState["filters"],
    value: string
  ) => void;
  getFilteredContacts: () => Contact[];
  bulkUpdateStatus: (status: ContactStatus) => Promise<void>;
  bulkAssign: (assignedTo: string) => Promise<void>;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  isLoading: false,
  error: null,
  selectedIds: new Set(),
  filters: {
    status: "all",
    sharedBy: "all",
    urgency: "all",
    search: "",
  },

  loadContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const contacts = await getAllContacts();
      set({ contacts, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to load contacts",
        isLoading: false,
      });
    }
  },

  importContacts: async (extracted) => {
    const now = new Date().toISOString();

    // Get LinkedIn URLs for duplicate checking
    const linkedinUrls = extracted
      .filter((e) => e.type === "linkedin")
      .map((e) => e.value);

    // Check for existing contacts
    const existingLinkedIn = await checkDuplicates(linkedinUrls);

    const newContacts: Contact[] = [];
    let duplicateCount = 0;

    for (const ext of extracted) {
      // Skip if LinkedIn URL already exists
      if (ext.type === "linkedin" && existingLinkedIn.has(ext.value)) {
        duplicateCount++;
        continue;
      }

      // Analyze context
      const parsedContext = analyzeContext(ext.contextMessages);
      const rawContext = formatRawContext(ext.contextMessages);

      // Create contact record
      const contact: Contact = {
        id: uuidv4(),
        sourceType: ext.type,
        rawValue: ext.value,
        linkedinUrl: ext.type === "linkedin" ? ext.value : "",
        name: ext.type === "linkedin" ? parseNameFromLinkedInUrl(ext.value) : "",
        company: "",
        title: "",
        phone: ext.type === "phone" ? ext.value : "",
        email: ext.type === "email" ? ext.value : "",
        website: ext.type === "other" ? ext.value : "",
        sharedBy: ext.message.sender,
        sharedDate: ext.message.timestamp.toISOString(),
        rawContext,
        parsedContext,
        status: "new",
        assignedTo: "",
        followUpDate: "",
        createdAt: now,
        updatedAt: now,
      };

      newContacts.push(contact);
    }

    if (newContacts.length > 0) {
      await addContacts(newContacts);

      // Log creation for each contact
      for (const contact of newContacts) {
        await logContactCreated(contact.id);
      }

      // Reload contacts
      await get().loadContacts();
    }

    return { added: newContacts.length, duplicates: duplicateCount };
  },

  updateContact: async (id, updates, logChange = true) => {
    const contact = get().contacts.find((c) => c.id === id);
    if (!contact) return;

    // Log changes
    if (logChange) {
      for (const [key, newValue] of Object.entries(updates)) {
        const oldValue = String(contact[key as keyof Contact] || "");
        const newValueStr = String(newValue || "");
        if (oldValue !== newValueStr) {
          await logContactUpdate(id, key, oldValue, newValueStr);
        }
      }
    }

    await dbUpdateContact(id, updates);
    await get().loadContacts();
  },

  deleteContact: async (id) => {
    await dbDeleteContact(id);
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      newSelected.delete(id);
      return { selectedIds: newSelected };
    });
    await get().loadContacts();
  },

  deleteSelected: async () => {
    const ids = Array.from(get().selectedIds);
    await dbDeleteContacts(ids);
    set({ selectedIds: new Set() });
    await get().loadContacts();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  toggleSelected: (id) => {
    set((state) => {
      const newSelected = new Set(state.selectedIds);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return { selectedIds: newSelected };
    });
  },

  selectAll: () => {
    const filtered = get().getFilteredContacts();
    set({ selectedIds: new Set(filtered.map((c) => c.id)) });
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    }));
  },

  getFilteredContacts: () => {
    const { contacts, filters } = get();

    return contacts.filter((contact) => {
      // Status filter
      if (filters.status !== "all" && contact.status !== filters.status) {
        return false;
      }

      // Shared by filter
      if (filters.sharedBy !== "all" && contact.sharedBy !== filters.sharedBy) {
        return false;
      }

      // Urgency filter
      if (
        filters.urgency !== "all" &&
        contact.parsedContext.urgency !== filters.urgency
      ) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase();
        const searchFields = [
          contact.name,
          contact.company,
          contact.title,
          contact.email,
          contact.phone,
          contact.linkedinUrl,
          contact.sharedBy,
          contact.rawContext,
        ];
        return searchFields.some(
          (field) => field && field.toLowerCase().includes(search)
        );
      }

      return true;
    });
  },

  bulkUpdateStatus: async (status) => {
    const ids = Array.from(get().selectedIds);
    for (const id of ids) {
      await get().updateContact(id, { status });
    }
    set({ selectedIds: new Set() });
  },

  bulkAssign: async (assignedTo) => {
    const ids = Array.from(get().selectedIds);
    for (const id of ids) {
      await get().updateContact(id, { assignedTo });
    }
    set({ selectedIds: new Set() });
  },
}));
