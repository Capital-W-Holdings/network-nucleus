"use client";

import { useState, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileText,
  CheckCircle2,
  Loader2,
  Users,
} from "lucide-react";
import { parseWhatsAppChat } from "@/lib/parser/whatsapp";
import { extractContactsFromChat } from "@/lib/parser/extractors";
import { analyzeContext } from "@/lib/parser/context";
import { useContactsStore } from "@/store/contacts";
import { ExtractedContact } from "@/types";
import toast from "react-hot-toast";
import Link from "next/link";

type ImportState = "idle" | "processing" | "preview" | "importing" | "complete";

export default function ImportPage() {
  const [state, setState] = useState<ImportState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [extractedContacts, setExtractedContacts] = useState<ExtractedContact[]>(
    []
  );
  const [stats, setStats] = useState<{
    totalMessages: number;
    contactsFound: number;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    added: number;
    duplicates: number;
  } | null>(null);

  const { importContacts } = useContactsStore();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith(".txt")) {
      processFile(droppedFile);
    } else {
      toast.error("Please upload a .txt file exported from WhatsApp");
    }
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        processFile(selectedFile);
      }
    },
    []
  );

  const processFile = async (file: File) => {
    setState("processing");
    setFile(file);

    try {
      const content = await file.text();
      const messages = parseWhatsAppChat(content);
      const contacts = extractContactsFromChat(messages);

      setStats({
        totalMessages: messages.length,
        contactsFound: contacts.length,
      });
      setExtractedContacts(contacts);
      setState("preview");

      if (contacts.length === 0) {
        toast("No contacts found in this chat", { icon: "ℹ️" });
      }
    } catch {
      toast.error("Failed to parse chat file");
      setState("idle");
    }
  };

  const handleImport = async () => {
    setState("importing");
    try {
      const result = await importContacts(extractedContacts);
      setImportResult(result);
      setState("complete");
      toast.success(`Imported ${result.added} contacts`);
    } catch {
      toast.error("Failed to import contacts");
      setState("preview");
    }
  };

  const handleReset = () => {
    setState("idle");
    setFile(null);
    setExtractedContacts([]);
    setStats(null);
    setImportResult(null);
  };

  return (
    <AppShell
      title="Import Contacts"
      description="Upload a WhatsApp chat export to extract contacts"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Upload Zone */}
        {state === "idle" && (
          <Card>
            <CardContent className="pt-6">
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  accept=".txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Drop WhatsApp chat export here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  or click to browse for a .txt file
                </p>
                <p className="text-xs text-muted-foreground">
                  Export a chat from WhatsApp: Chat → More → Export Chat →
                  Without Media
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">
                  Processing {file?.name}...
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preview State */}
        {state === "preview" && stats && (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-base">{file?.name}</CardTitle>
                      <CardDescription>
                        {stats.totalMessages.toLocaleString()} messages parsed
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {stats.contactsFound} contacts found
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {extractedContacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Contacts</CardTitle>
                  <CardDescription>
                    Review contacts before importing. Duplicates will be skipped.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Shared By</TableHead>
                          <TableHead>Urgency</TableHead>
                          <TableHead>Context Preview</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {extractedContacts.slice(0, 20).map((contact, index) => {
                          const context = analyzeContext(contact.contextMessages);
                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="outline">{contact.type}</Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm max-w-[200px] truncate">
                                {contact.value}
                              </TableCell>
                              <TableCell>{contact.message.sender}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    context.urgency === "hot"
                                      ? "hot"
                                      : context.urgency === "warm"
                                      ? "warm"
                                      : "cold"
                                  }
                                >
                                  {context.urgency}
                                </Badge>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">
                                {context.reason || context.relationship || "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {extractedContacts.length > 20 && (
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      Showing 20 of {extractedContacts.length} contacts
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button
                onClick={handleImport}
                disabled={extractedContacts.length === 0}
              >
                Import {extractedContacts.length} Contacts
              </Button>
            </div>
          </>
        )}

        {/* Importing State */}
        {state === "importing" && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Importing contacts...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete State */}
        {state === "complete" && importResult && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center py-12">
                <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">Import Complete</h3>
                <div className="flex gap-4 mb-6">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{importResult.added}</p>
                    <p className="text-sm text-muted-foreground">
                      contacts added
                    </p>
                  </div>
                  {importResult.duplicates > 0 && (
                    <div className="text-center">
                      <p className="text-3xl font-bold text-muted-foreground">
                        {importResult.duplicates}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        duplicates skipped
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleReset}>
                    Import More
                  </Button>
                  <Button asChild>
                    <Link href="/contacts">
                      <Users className="h-4 w-4 mr-2" />
                      View Contacts
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State Hint */}
        {state === "idle" && (
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-2">What gets extracted:</p>
            <div className="flex justify-center gap-4">
              <span>LinkedIn profiles</span>
              <span>•</span>
              <span>Phone numbers</span>
              <span>•</span>
              <span>Email addresses</span>
              <span>•</span>
              <span>Portfolio URLs</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
