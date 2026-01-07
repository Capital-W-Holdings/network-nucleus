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
} from "lucide-react";
import { useContactsStore } from "@/store/contacts";
import { Contact, ContactStatus } from "@/types";
import { timeAgo, truncate } from "@/lib/utils";
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
                />
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border">
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
                    <TableHead>Quick Actions</TableHead>
                    <TableHead>Shared By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-[50px]" />
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
}

// Quick action buttons component
function QuickActions({ contact, size = "default" }: { contact: Contact; size?: "default" | "sm" }) {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  const hasLinkedIn = !!contact.linkedinUrl;
  const hasPhone = !!contact.phone;
  const hasEmail = !!contact.email;
  const hasWebsite = !!contact.website;

  if (!hasLinkedIn && !hasPhone && !hasEmail && !hasWebsite) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  return (
    <div className="flex items-center gap-1">
      {hasLinkedIn && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contact.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-md ${buttonSize} bg-[#0A66C2] text-white hover:bg-[#004182] transition-colors`}
              onClick={(e) => e.stopPropagation()}
            >
              <Linkedin className={iconSize} />
            </a>
          </TooltipTrigger>
          <TooltipContent>Open LinkedIn</TooltipContent>
        </Tooltip>
      )}

      {hasPhone && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`tel:${contact.phone}`}
              className={`inline-flex items-center justify-center rounded-md ${buttonSize} bg-green-600 text-white hover:bg-green-700 transition-colors`}
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className={iconSize} />
            </a>
          </TooltipTrigger>
          <TooltipContent>Call {contact.phone}</TooltipContent>
        </Tooltip>
      )}

      {hasEmail && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={`mailto:${contact.email}`}
              className={`inline-flex items-center justify-center rounded-md ${buttonSize} bg-orange-500 text-white hover:bg-orange-600 transition-colors`}
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className={iconSize} />
            </a>
          </TooltipTrigger>
          <TooltipContent>Email {contact.email}</TooltipContent>
        </Tooltip>
      )}

      {hasWebsite && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={contact.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center justify-center rounded-md ${buttonSize} bg-gray-600 text-white hover:bg-gray-700 transition-colors`}
              onClick={(e) => e.stopPropagation()}
            >
              <Globe className={iconSize} />
            </a>
          </TooltipTrigger>
          <TooltipContent>Open Website</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

function MobileContactCard({
  contact,
  isSelected,
  onToggleSelect,
  onStatusChange,
  onDelete,
}: ContactRowProps) {
  const displayValue =
    contact.name ||
    contact.linkedinUrl ||
    contact.email ||
    contact.phone ||
    contact.website ||
    contact.rawValue;

  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <Link href={`/contacts/${contact.id}`} className="block">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium truncate">
                {truncate(displayValue, 30)}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
            {contact.company && (
              <p className="text-xs text-muted-foreground truncate">
                {contact.company}
                {contact.title && ` · ${contact.title}`}
              </p>
            )}
          </Link>

          {/* Quick Actions - prominent on mobile */}
          <div className="flex items-center gap-2 mt-3">
            <QuickActions contact={contact} size="sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge
              variant={
                contact.parsedContext.urgency === "hot"
                  ? "hot"
                  : contact.parsedContext.urgency === "warm"
                  ? "warm"
                  : "cold"
              }
              className="text-xs"
            >
              {contact.parsedContext.urgency}
            </Badge>
            <Select
              value={contact.status}
              onValueChange={(value) =>
                onStatusChange(contact.id, value as ContactStatus)
              }
            >
              <SelectTrigger className="h-6 w-auto px-2 text-xs">
                <Badge variant={contact.status as ContactStatus} className="text-xs">
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
          </div>

          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>From {contact.sharedBy}</span>
            <span>{timeAgo(contact.sharedDate)}</span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
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
}: ContactRowProps) {
  const displayValue =
    contact.name ||
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
      <TableCell>
        <QuickActions contact={contact} />
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
