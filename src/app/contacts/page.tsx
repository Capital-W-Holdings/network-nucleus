"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  MoreHorizontal,
  Trash2,
  Download,
  Users,
  ChevronDown,
  ChevronRight,
  Linkedin,
  Phone,
  Mail,
  Globe,
  StickyNote,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useContactsStore } from "@/store/contacts";
import { Contact, ContactStatus } from "@/types";
import { timeAgo, truncate } from "@/lib/utils";
import toast from "react-hot-toast";
import { getUniqueSharedBy } from "@/lib/db";

// Notes Modal Component
function NotesModal({
  contact,
  open,
  onClose,
  onSave,
}: {
  contact: Contact | null;
  open: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(contact?.parsedContext.notes || "");

  useEffect(() => {
    if (contact) {
      setNotes(contact.parsedContext.notes || "");
    }
  }, [contact]);

  if (!contact) return null;

  const displayName = getContactDisplayName(contact);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Notes for {displayName}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about this contact..."
            className="min-h-[150px] text-sm"
          />
          {contact.rawContext && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">Original Context:</p>
              <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-[100px] overflow-y-auto whitespace-pre-wrap">
                {contact.rawContext}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSave(notes);
              onClose();
            }}
          >
            Save Notes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const STATUS_OPTIONS: { value: ContactStatus | "all"; label: string }[] = [
  { value: "all", label: "All Statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "converted", label: "Converted" },
  { value: "passed", label: "Passed" },
];

const URGENCY_OPTIONS = [
  { value: "all", label: "All Urgency" },
  { value: "hot", label: "Hot" },
  { value: "warm", label: "Warm" },
  { value: "cold", label: "Cold" },
];

export default function ContactsPage() {
  const {
    contacts,
    isLoading,
    loadContacts,
    updateContact,
    deleteContact,
    selectedIds,
    toggleSelected,
    selectAll,
    clearSelection,
    setFilter,
    filters,
    getFilteredContacts,
    bulkUpdateStatus,
    deleteSelected,
  } = useContactsStore();

  const [senders, setSenders] = useState<string[]>([]);
  const [notesModalContact, setNotesModalContact] = useState<Contact | null>(null);
  const filteredContacts = getFilteredContacts();

  const handleSaveNotes = async (notes: string) => {
    if (!notesModalContact) return;
    await updateContact(notesModalContact.id, {
      parsedContext: {
        ...notesModalContact.parsedContext,
        notes,
      },
    });
    toast.success("Notes saved");
  };

  useEffect(() => {
    loadContacts();
    getUniqueSharedBy().then(setSenders);
  }, [loadContacts]);

  const handleStatusChange = async (id: string, status: ContactStatus) => {
    await updateContact(id, { status });
    toast.success("Status updated");
  };

  const handleDelete = async (id: string) => {
    await deleteContact(id);
    toast.success("Contact deleted");
  };

  const handleBulkDelete = async () => {
    if (
      confirm(`Delete ${selectedIds.size} selected contacts? This cannot be undone.`)
    ) {
      await deleteSelected();
      toast.success(`Deleted ${selectedIds.size} contacts`);
    }
  };

  const allSelected =
    filteredContacts.length > 0 &&
    filteredContacts.every((c) => selectedIds.has(c.id));

  return (
    <TooltipProvider>
      <NotesModal
        contact={notesModalContact}
        open={!!notesModalContact}
        onClose={() => setNotesModalContact(null)}
        onSave={handleSaveNotes}
      />
      <AppShell
        title="Contacts"
        description={`${filteredContacts.length} contacts`}
        actions={
          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  {selectedIds.size} selected
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <span className="hidden sm:inline">Bulk Actions</span>
                      <span className="sm:hidden">Actions</span>
                      <ChevronDown className="ml-1 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {STATUS_OPTIONS.filter((s) => s.value !== "all").map(
                      (status) => (
                        <DropdownMenuItem
                          key={status.value}
                          onClick={() =>
                            bulkUpdateStatus(status.value as ContactStatus)
                          }
                        >
                          Set as {status.label}
                        </DropdownMenuItem>
                      )
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleBulkDelete}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href="/">
                  <Download className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Import</span>
                </Link>
              </Button>
            )}
          </div>
        }
      >
        {/* Filters */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select
              value={filters.status}
              onValueChange={(value) => setFilter("status", value)}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.urgency}
              onValueChange={(value) => setFilter("urgency", value)}
            >
              <SelectTrigger className="w-[110px] h-9 text-xs">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                {URGENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.sharedBy}
              onValueChange={(value) => setFilter("sharedBy", value)}
            >
              <SelectTrigger className="w-[130px] h-9 text-xs">
                <SelectValue placeholder="Shared By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Senders</SelectItem>
                {senders.map((sender) => (
                  <SelectItem key={sender} value={sender}>
                    {truncate(sender, 20)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No contacts found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {contacts.length === 0
                ? "Import a WhatsApp chat to get started"
                : "Try adjusting your filters"}
            </p>
            {contacts.length === 0 && (
              <Button asChild>
                <Link href="/">Import Chat</Link>
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {filteredContacts.map((contact) => (
                <MobileContactCard
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedIds.has(contact.id)}
                  onToggleSelect={() => toggleSelected(contact.id)}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onNotesClick={setNotesModalContact}
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border overflow-x-auto">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAll();
                          } else {
                            clearSelection();
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Actions</TableHead>
                    <TableHead className="text-xs">From</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Urgency</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="w-8" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <DesktopContactRow
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedIds.has(contact.id)}
                      onToggleSelect={() => toggleSelected(contact.id)}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      onNotesClick={setNotesModalContact}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </AppShell>
    </TooltipProvider>
  );
}

interface ContactRowProps {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: () => void;
  onStatusChange: (id: string, status: ContactStatus) => void;
  onDelete: (id: string) => void;
  onNotesClick: (contact: Contact) => void;
}

// Helper to extract clean name from LinkedIn URL
function getLinkedInName(url: string): string {
  const match = url.match(/linkedin\.com\/(?:in|company)\/([a-zA-Z0-9_-]+)/i);
  if (match) {
    const slug = match[1];
    // Filter out slugs that are mostly numbers or look like IDs
    if (/^\d+$/.test(slug) || /^[a-z]{1,2}\d{5,}$/i.test(slug)) {
      return "";
    }
    // Convert kebab-case to title case, filter out numbers
    return slug
      .split("-")
      .filter(word => !/^\d+$/.test(word)) // Remove pure number segments
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
      .trim();
  }
  return "";
}

// Get display name for contact
function getContactDisplayName(contact: Contact): string {
  // Priority 1: Explicit name
  if (contact.name && contact.name.trim()) return contact.name;

  // Priority 2: LinkedIn URL parsed name
  if (contact.linkedinUrl) {
    const linkedInName = getLinkedInName(contact.linkedinUrl);
    if (linkedInName && linkedInName.length > 2) return linkedInName;
  }

  // Priority 3: Email name part
  if (contact.email) {
    const emailPart = contact.email.split("@")[0];
    // Clean up email prefix
    const cleanName = emailPart
      .replace(/[._]/g, " ")
      .replace(/\d+/g, "") // Remove numbers
      .trim();
    if (cleanName.length > 2) {
      return cleanName
        .split(" ")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }

  // Priority 4: Phone number
  if (contact.phone) return contact.phone;

  // Priority 5: Raw value (truncated)
  if (contact.rawValue) {
    return truncate(contact.rawValue, 30);
  }

  return "Unknown";
}

// Compact quick action buttons - icons with tooltips
function QuickActions({ contact, onNotesClick }: { contact: Contact; onNotesClick: () => void }) {
  const hasLinkedIn = !!contact.linkedinUrl;
  const hasPhone = !!contact.phone;
  const hasEmail = !!contact.email;
  const hasWebsite = !!contact.website;
  const hasNotes = !!contact.parsedContext.notes;

  return (
    <div className="flex items-center gap-1">
      {hasLinkedIn && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>LinkedIn</TooltipContent>
        </Tooltip>
      )}

      {hasPhone && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`tel:${contact.phone}`}
              className="inline-flex items-center justify-center w-7 h-7 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>{contact.phone}</TooltipContent>
        </Tooltip>
      )}

      {hasEmail && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`mailto:${contact.email}`}
              className="inline-flex items-center justify-center w-7 h-7 rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>{contact.email}</TooltipContent>
        </Tooltip>
      )}

      {hasWebsite && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className="h-3.5 w-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>Website</TooltipContent>
        </Tooltip>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onNotesClick();
            }}
            className={`inline-flex items-center justify-center w-7 h-7 rounded transition-colors ${
              hasNotes
                ? "bg-yellow-500 text-white hover:bg-yellow-600"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent>{hasNotes ? "View/Edit Notes" : "Add Notes"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

// Context info badges
function ContextInfo({ contact, compact = false }: { contact: Contact; compact?: boolean }) {
  const ctx = contact.parsedContext;
  const items: { label: string; value: string; color: string }[] = [];

  if (ctx.relationship && ctx.relationship !== "unknown") {
    items.push({ label: "Relationship", value: ctx.relationship, color: "bg-blue-100 text-blue-800" });
  }
  if (ctx.reason && ctx.reason !== "unknown") {
    items.push({ label: "Reason", value: ctx.reason, color: "bg-purple-100 text-purple-800" });
  }
  if (ctx.sector && ctx.sector !== "unknown") {
    items.push({ label: "Sector", value: ctx.sector, color: "bg-emerald-100 text-emerald-800" });
  }
  if (ctx.dealSize && ctx.dealSize !== "unknown") {
    items.push({ label: "Deal", value: ctx.dealSize, color: "bg-amber-100 text-amber-800" });
  }

  if (items.length === 0) return null;

  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.slice(0, 2).map((item) => (
          <span key={item.label} className={`text-[10px] px-1.5 py-0.5 rounded ${item.color}`}>
            {item.value}
          </span>
        ))}
        {items.length > 2 && (
          <span className="text-[10px] text-muted-foreground">+{items.length - 2} more</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {items.map((item) => (
        <span key={item.label} className={`text-xs px-2 py-0.5 rounded ${item.color}`}>
          {item.label}: {item.value}
        </span>
      ))}
    </div>
  );
}

function MobileContactCard({
  contact,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onDelete,
  onNotesClick,
}: ContactRowProps) {
  const displayName = getContactDisplayName(contact);

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start gap-2">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-0.5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/contacts/${contact.id}`} className="flex-1 min-w-0">
              <span className="font-medium text-sm block truncate">{displayName}</span>
              {contact.company && (
                <span className="text-xs text-muted-foreground block truncate">
                  {contact.company}
                </span>
              )}
            </Link>
            <QuickActions contact={contact} onNotesClick={() => onNotesClick(contact)} />
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={
                contact.parsedContext.urgency === "hot"
                  ? "hot"
                  : contact.parsedContext.urgency === "warm"
                  ? "warm"
                  : "cold"
              }
              className="text-[10px] px-1.5"
            >
              {contact.parsedContext.urgency}
            </Badge>
            <Badge variant={contact.status as ContactStatus} className="text-[10px] px-1.5">
              {contact.status.replace("_", " ")}
            </Badge>
            <span className="text-[10px] text-muted-foreground ml-auto">
              {timeAgo(contact.sharedDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopContactRow({
  contact,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onDelete,
  onNotesClick,
}: ContactRowProps) {
  const displayName = getContactDisplayName(contact);

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell className="w-8 pr-0">
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell>
        <Link href={`/contacts/${contact.id}`} className="hover:underline">
          <span className="font-medium text-sm">{displayName}</span>
        </Link>
      </TableCell>
      <TableCell>
        <QuickActions contact={contact} onNotesClick={() => onNotesClick(contact)} />
      </TableCell>
      <TableCell className="text-xs text-muted-foreground max-w-[100px] truncate">
        {contact.sharedBy}
      </TableCell>
      <TableCell>
        <Badge variant={contact.status as ContactStatus} className="text-[10px]">
          {contact.status.replace("_", " ")}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge
          variant={
            contact.parsedContext.urgency === "hot"
              ? "hot"
              : contact.parsedContext.urgency === "warm"
              ? "warm"
              : "cold"
          }
          className="text-[10px]"
        >
          {contact.parsedContext.urgency}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {timeAgo(contact.sharedDate)}
      </TableCell>
      <TableCell className="w-8 pl-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onDelete(contact.id)}
              className="text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
