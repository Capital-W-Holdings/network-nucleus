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
  Search,
  MoreHorizontal,
  ExternalLink,
  Copy,
  Trash2,
  Download,
  Users,
  Filter,
  ChevronDown,
} from "lucide-react";
import { useContactsStore } from "@/store/contacts";
import { Contact, ContactStatus } from "@/types";
import { formatDate, timeAgo, copyToClipboard, truncate } from "@/lib/utils";
import toast from "react-hot-toast";
import { getUniqueSharedBy } from "@/lib/db";

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
  const filteredContacts = getFilteredContacts();

  useEffect(() => {
    loadContacts();
    getUniqueSharedBy().then(setSenders);
  }, [loadContacts]);

  const handleCopyLink = async (url: string) => {
    await copyToClipboard(url);
    toast.success("Copied to clipboard");
  };

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
    <AppShell
      title="Contacts"
      description={`${filteredContacts.length} contacts`}
      actions={
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} selected
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    Bulk Actions
                    <ChevronDown className="ml-2 h-4 w-4" />
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
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <Download className="mr-2 h-4 w-4" />
              Import
            </Link>
          </Button>
        </div>
      }
    >
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) => setFilter("status", value)}
        >
          <SelectTrigger className="w-[160px]">
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
          <SelectTrigger className="w-[140px]">
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
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Shared By" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Senders</SelectItem>
            {senders.map((sender) => (
              <SelectItem key={sender} value={sender}>
                {sender}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
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
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
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
                <TableHead>Contact</TableHead>
                <TableHead>Shared By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact) => (
                <ContactRow
                  key={contact.id}
                  contact={contact}
                  isSelected={selectedIds.has(contact.id)}
                  onToggleSelect={() => toggleSelected(contact.id)}
                  onStatusChange={handleStatusChange}
                  onCopyLink={handleCopyLink}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </AppShell>
  );
}

interface ContactRowProps {
  contact: Contact;
  isSelected: boolean;
  onToggleSelect: () => void;
  onStatusChange: (id: string, status: ContactStatus) => void;
  onCopyLink: (url: string) => void;
  onDelete: (id: string) => void;
}

function ContactRow({
  contact,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onCopyLink,
  onDelete,
}: ContactRowProps) {
  const displayValue =
    contact.name ||
    contact.linkedinUrl ||
    contact.email ||
    contact.phone ||
    contact.website ||
    contact.rawValue;

  const copyableValue =
    contact.linkedinUrl ||
    contact.email ||
    contact.phone ||
    contact.website ||
    contact.rawValue;

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell>
        <Link
          href={`/contacts/${contact.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-medium">{truncate(displayValue, 40)}</span>
          {contact.sourceType !== "linkedin" && contact.name && (
            <span className="text-xs text-muted-foreground">
              {contact.sourceType}
            </span>
          )}
          {contact.company && (
            <span className="text-xs text-muted-foreground">
              {contact.company}
              {contact.title && ` · ${contact.title}`}
            </span>
          )}
        </Link>
      </TableCell>
      <TableCell className="text-sm">{contact.sharedBy}</TableCell>
      <TableCell>
        <Select
          value={contact.status}
          onValueChange={(value) =>
            onStatusChange(contact.id, value as ContactStatus)
          }
        >
          <SelectTrigger className="h-7 w-[110px]">
            <Badge variant={contact.status as ContactStatus}>
              {contact.status.replace("_", " ")}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.filter((s) => s.value !== "all").map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        >
          {contact.parsedContext.urgency}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <span className="text-sm text-muted-foreground truncate block">
          {contact.parsedContext.reason ||
            contact.parsedContext.relationship ||
            "-"}
        </span>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {timeAgo(contact.sharedDate)}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {contact.linkedinUrl && (
              <DropdownMenuItem asChild>
                <a
                  href={contact.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open LinkedIn
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onCopyLink(copyableValue)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy {contact.sourceType === "linkedin" ? "URL" : contact.sourceType}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
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
