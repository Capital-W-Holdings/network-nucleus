"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  FileSpreadsheet,
  FileJson,
  Webhook,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useContactsStore } from "@/store/contacts";
import { clearAllData, getAllContacts } from "@/lib/db";
import { exportToCSV, exportToExcel, exportToJSON, sendToWebhook } from "@/lib/export";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [isSendingWebhook, setIsSendingWebhook] = useState(false);
  const { contacts, loadContacts } = useContactsStore();

  useEffect(() => {
    loadContacts();
    // Load saved webhook URL from localStorage
    const saved = localStorage.getItem("network-nucleus-webhook-url");
    if (saved) setWebhookUrl(saved);
  }, [loadContacts]);

  const handleExportCSV = async () => {
    const allContacts = await getAllContacts();
    if (allContacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    exportToCSV(allContacts);
    toast.success("Exported to CSV");
  };

  const handleExportExcel = async () => {
    const allContacts = await getAllContacts();
    if (allContacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    exportToExcel(allContacts);
    toast.success("Exported to Excel");
  };

  const handleExportJSON = async () => {
    const allContacts = await getAllContacts();
    if (allContacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    exportToJSON(allContacts);
    toast.success("Exported to JSON");
  };

  const handleSaveWebhookUrl = () => {
    localStorage.setItem("network-nucleus-webhook-url", webhookUrl);
    toast.success("Webhook URL saved");
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl) {
      toast.error("Please enter a webhook URL");
      return;
    }

    setIsSendingWebhook(true);
    const allContacts = await getAllContacts();
    const result = await sendToWebhook(allContacts, webhookUrl);

    if (result.success) {
      toast.success("Webhook sent successfully");
    } else {
      toast.error(`Webhook failed: ${result.error}`);
    }
    setIsSendingWebhook(false);
  };

  const handleClearData = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL contacts and activity logs? This cannot be undone."
      )
    ) {
      return;
    }

    if (!confirm("This is your final warning. All data will be permanently deleted.")) {
      return;
    }

    await clearAllData();
    await loadContacts();
    toast.success("All data has been deleted");
  };

  return (
    <AppShell title="Settings" description="Export data and configure integrations">
      <div className="max-w-2xl space-y-6">
        {/* Export Section */}
        <Card>
          <CardHeader>
            <CardTitle>Export Contacts</CardTitle>
            <CardDescription>
              Download all {contacts.length} contacts in your preferred format
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                disabled={contacts.length === 0}
                className="h-auto py-4 flex-col gap-2"
              >
                <Download className="h-5 w-5" />
                <span>Export CSV</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportExcel}
                disabled={contacts.length === 0}
                className="h-auto py-4 flex-col gap-2"
              >
                <FileSpreadsheet className="h-5 w-5" />
                <span>Export Excel</span>
              </Button>

              <Button
                variant="outline"
                onClick={handleExportJSON}
                disabled={contacts.length === 0}
                className="h-auto py-4 flex-col gap-2"
              >
                <FileJson className="h-5 w-5" />
                <span>Export JSON</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Webhook Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Integration
            </CardTitle>
            <CardDescription>
              Sync contacts to your CRM or automation tool
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Webhook URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-crm.com/api/webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                We&apos;ll POST a JSON payload with all contacts to this URL
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSaveWebhookUrl}>
                Save URL
              </Button>
              <Button
                onClick={handleTestWebhook}
                disabled={!webhookUrl || isSendingWebhook}
              >
                {isSendingWebhook ? "Sending..." : "Send Now"}
              </Button>
            </div>

            <div className="rounded-lg bg-muted p-4 text-sm">
              <p className="font-medium mb-2">Webhook payload format:</p>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(
                  {
                    timestamp: "2024-01-15T10:30:00Z",
                    count: 42,
                    contacts: [
                      {
                        id: "uuid",
                        name: "John Doe",
                        linkedin_url: "...",
                        status: "new",
                        "...": "...",
                      },
                    ],
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <div>
                <p className="font-medium">Delete All Data</p>
                <p className="text-sm text-muted-foreground">
                  Remove all contacts and activity logs permanently
                </p>
              </div>
              <Button variant="destructive" onClick={handleClearData}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>About Network Nucleus</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              Network Nucleus extracts and organizes contact intelligence from
              WhatsApp chat exports. All data is stored locally in your browser
              using IndexedDB.
            </p>
            <p>
              <strong>Privacy:</strong> Your data never leaves your device
              unless you explicitly export it or configure a webhook.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
