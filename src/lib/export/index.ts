import { Contact } from "@/types";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// Flatten contact for export
function flattenContact(contact: Contact): Record<string, string> {
  return {
    id: contact.id,
    name: contact.name,
    company: contact.company,
    title: contact.title,
    email: contact.email,
    phone: contact.phone,
    linkedin_url: contact.linkedinUrl,
    website: contact.website,
    source_type: contact.sourceType,
    raw_value: contact.rawValue,
    shared_by: contact.sharedBy,
    shared_date: contact.sharedDate,
    status: contact.status,
    urgency: contact.parsedContext.urgency,
    relationship: contact.parsedContext.relationship,
    reason: contact.parsedContext.reason,
    sector: contact.parsedContext.sector,
    deal_size: contact.parsedContext.dealSize,
    notes: contact.parsedContext.notes,
    assigned_to: contact.assignedTo,
    follow_up_date: contact.followUpDate,
    created_at: contact.createdAt,
    updated_at: contact.updatedAt,
  };
}

export function exportToCSV(contacts: Contact[], filename: string = "contacts"): void {
  const flatData = contacts.map(flattenContact);
  const csv = Papa.unparse(flatData);

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToExcel(contacts: Contact[], filename: string = "contacts"): void {
  const flatData = contacts.map(flattenContact);

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(flatData);

  // Auto-size columns
  const columnWidths = Object.keys(flatData[0] || {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...flatData.map((row) => String(row[key] || "").length).slice(0, 100)
    ),
  }));
  worksheet["!cols"] = columnWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, "Contacts");

  // Generate Excel file
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, `${filename}.xlsx`);
}

export function exportToJSON(contacts: Contact[], filename: string = "contacts"): void {
  const json = JSON.stringify(contacts, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  downloadBlob(blob, `${filename}.json`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatContactForCopy(contact: Contact): string {
  const lines = [];

  if (contact.name) lines.push(`Name: ${contact.name}`);
  if (contact.company) lines.push(`Company: ${contact.company}`);
  if (contact.title) lines.push(`Title: ${contact.title}`);
  if (contact.email) lines.push(`Email: ${contact.email}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  if (contact.linkedinUrl) lines.push(`LinkedIn: ${contact.linkedinUrl}`);
  if (contact.website) lines.push(`Website: ${contact.website}`);
  lines.push("");
  lines.push(`Status: ${contact.status}`);
  lines.push(`Urgency: ${contact.parsedContext.urgency}`);
  if (contact.parsedContext.relationship) {
    lines.push(`Relationship: ${contact.parsedContext.relationship}`);
  }
  if (contact.parsedContext.reason) {
    lines.push(`Reason: ${contact.parsedContext.reason}`);
  }
  if (contact.parsedContext.sector) {
    lines.push(`Sector: ${contact.parsedContext.sector}`);
  }
  if (contact.parsedContext.dealSize) {
    lines.push(`Deal Size: ${contact.parsedContext.dealSize}`);
  }
  lines.push("");
  lines.push(`Shared by: ${contact.sharedBy}`);
  lines.push(`Date: ${new Date(contact.sharedDate).toLocaleDateString()}`);

  return lines.join("\n");
}

// Webhook integration
export async function sendToWebhook(
  contacts: Contact[],
  webhookUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        count: contacts.length,
        contacts: contacts.map(flattenContact),
      }),
    });

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
