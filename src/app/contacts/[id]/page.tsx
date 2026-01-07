"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  Trash2,
  Save,
  Linkedin,
  Phone,
  Mail,
  Globe,
  User,
  Building,
  Briefcase,
  Calendar,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { Contact, ContactStatus, ActivityLogEntry } from "@/types";
import { getContact, getActivityLogForContact, deleteContact } from "@/lib/db";
import { useContactsStore } from "@/store/contacts";
import { formatDateTime, copyToClipboard } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_OPTIONS: { value: ContactStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "in_progress", label: "In Progress" },
  { value: "converted", label: "Converted" },
  { value: "passed", label: "Passed" },
];

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editedContact, setEditedContact] = useState<Partial<Contact>>({});

  const { updateContact, loadContacts } = useContactsStore();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [contactData, logs] = await Promise.all([
        getContact(id),
        getActivityLogForContact(id),
      ]);
      if (contactData) {
        setContact(contactData);
        setEditedContact(contactData);
      }
      setActivityLog(logs);
      setIsLoading(false);
    }
    loadData();
  }, [id]);

  const handleSave = async () => {
    if (!contact) return;
    setIsSaving(true);
    try {
      await updateContact(contact.id, editedContact);
      const updatedContact = await getContact(id);
      if (updatedContact) {
        setContact(updatedContact);
        setEditedContact(updatedContact);
      }
      const logs = await getActivityLogForContact(id);
      setActivityLog(logs);
      toast.success("Contact saved");
    } catch {
      toast.error("Failed to save contact");
    }
    setIsSaving(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this contact? This cannot be undone.")) return;
    await deleteContact(id);
    await loadContacts();
    toast.success("Contact deleted");
    router.push("/contacts");
  };

  const handleCopy = async (text: string, label: string) => {
    await copyToClipboard(text);
    toast.success(`${label} copied`);
  };

  const updateField = (field: keyof Contact, value: string) => {
    setEditedContact((prev) => ({ ...prev, [field]: value }));
  };

  const updateContextField = (
    field: keyof Contact["parsedContext"],
    value: string
  ) => {
    const defaultContext = {
      relationship: "",
      reason: "",
      sector: "",
      dealSize: "",
      urgency: "warm" as const,
      notes: "",
    };
    setEditedContact((prev) => ({
      ...prev,
      parsedContext: {
        ...defaultContext,
        ...contact?.parsedContext,
        ...prev.parsedContext,
        [field]: value,
      },
    }));
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </AppShell>
    );
  }

  if (!contact) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-lg font-medium mb-2">Contact not found</h2>
          <Button asChild>
            <Link href="/contacts">Back to Contacts</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const hasChanges = JSON.stringify(contact) !== JSON.stringify(editedContact);

  return (
    <AppShell
      title={
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span>{contact.name || contact.rawValue}</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges || isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Details */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <div className="flex gap-2">
                  <User className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="name"
                    value={editedContact.name || ""}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="Full name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <div className="flex gap-2">
                  <Building className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="company"
                    value={editedContact.company || ""}
                    onChange={(e) => updateField("company", e.target.value)}
                    placeholder="Company name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <div className="flex gap-2">
                  <Briefcase className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="title"
                    value={editedContact.title || ""}
                    onChange={(e) => updateField("title", e.target.value)}
                    placeholder="Job title"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Mail className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={editedContact.email || ""}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="email@example.com"
                  />
                  {contact.email && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(contact.email, "Email")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="flex gap-2">
                  <Phone className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="phone"
                    value={editedContact.phone || ""}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+1 (555) 000-0000"
                  />
                  {contact.phone && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleCopy(contact.phone, "Phone")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedin">LinkedIn</Label>
                <div className="flex gap-2">
                  <Linkedin className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="linkedin"
                    value={editedContact.linkedinUrl || ""}
                    onChange={(e) => updateField("linkedinUrl", e.target.value)}
                    placeholder="linkedin.com/in/username"
                  />
                  {contact.linkedinUrl && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          handleCopy(contact.linkedinUrl, "LinkedIn URL")
                        }
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={contact.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <div className="flex gap-2">
                  <Globe className="h-4 w-4 mt-2.5 text-muted-foreground" />
                  <Input
                    id="website"
                    value={editedContact.website || ""}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://example.com"
                  />
                  {contact.website && (
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={contact.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Context */}
          <Card>
            <CardHeader>
              <CardTitle>Context</CardTitle>
              <CardDescription>
                Relationship and reason for sharing
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship</Label>
                <Input
                  id="relationship"
                  value={editedContact.parsedContext?.relationship || ""}
                  onChange={(e) =>
                    updateContextField("relationship", e.target.value)
                  }
                  placeholder="e.g., Former colleague"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Sharing</Label>
                <Input
                  id="reason"
                  value={editedContact.parsedContext?.reason || ""}
                  onChange={(e) => updateContextField("reason", e.target.value)}
                  placeholder="e.g., Looking for funding"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Sector</Label>
                <Input
                  id="sector"
                  value={editedContact.parsedContext?.sector || ""}
                  onChange={(e) => updateContextField("sector", e.target.value)}
                  placeholder="e.g., Fintech, SaaS"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dealSize">Deal Size</Label>
                <Input
                  id="dealSize"
                  value={editedContact.parsedContext?.dealSize || ""}
                  onChange={(e) => updateContextField("dealSize", e.target.value)}
                  placeholder="e.g., $5M Series A"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editedContact.parsedContext?.notes || ""}
                  onChange={(e) => updateContextField("notes", e.target.value)}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Original Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Original Messages</CardTitle>
              <CardDescription>
                The context from the WhatsApp chat
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap font-mono">
                {contact.rawContext || "No context available"}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editedContact.status}
                  onValueChange={(value) =>
                    updateField("status", value as ContactStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select
                  value={editedContact.parsedContext?.urgency}
                  onValueChange={(value) => updateContextField("urgency", value)}
                >
                  <SelectTrigger>
                    <Badge
                      variant={
                        editedContact.parsedContext?.urgency === "hot"
                          ? "hot"
                          : editedContact.parsedContext?.urgency === "warm"
                          ? "warm"
                          : "cold"
                      }
                    >
                      {editedContact.parsedContext?.urgency || "warm"}
                    </Badge>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="cold">Cold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assigned To</Label>
                <Input
                  id="assignedTo"
                  value={editedContact.assignedTo || ""}
                  onChange={(e) => updateField("assignedTo", e.target.value)}
                  placeholder="Team member name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="followUpDate">Follow-up Date</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={editedContact.followUpDate || ""}
                  onChange={(e) => updateField("followUpDate", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Source Info */}
          <Card>
            <CardHeader>
              <CardTitle>Source</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shared by</span>
                <span className="font-medium">{contact.sharedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date shared</span>
                <span>{formatDateTime(contact.sharedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Source type</span>
                <Badge variant="outline">{contact.sourceType}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Added</span>
                <span>{formatDateTime(contact.createdAt)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Log */}
          <Card>
            <CardHeader>
              <CardTitle>Activity Log</CardTitle>
            </CardHeader>
            <CardContent>
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.slice(0, 10).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p>
                          {entry.action === "created" ? (
                            "Contact created"
                          ) : (
                            <>
                              Changed <strong>{entry.field}</strong>
                              {entry.oldValue && (
                                <>
                                  {" "}
                                  from{" "}
                                  <span className="text-muted-foreground">
                                    {entry.oldValue}
                                  </span>
                                </>
                              )}
                              {entry.newValue && (
                                <>
                                  {" "}
                                  to{" "}
                                  <span className="font-medium">
                                    {entry.newValue}
                                  </span>
                                </>
                              )}
                            </>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
