export type UrgencyLevel = "hot" | "warm" | "cold";

export type ContactStatus =
  | "new"
  | "contacted"
  | "in_progress"
  | "converted"
  | "passed";

export type SourceType = "linkedin" | "phone" | "email" | "other";

export interface ParsedContext {
  relationship: string;
  reason: string;
  sector: string;
  dealSize: string;
  urgency: UrgencyLevel;
  notes: string;
}

export interface Contact {
  id: string;
  sourceType: SourceType;
  rawValue: string;
  linkedinUrl: string;
  name: string;
  company: string;
  title: string;
  phone: string;
  email: string;
  website: string;
  sharedBy: string;
  sharedDate: string;
  rawContext: string;
  parsedContext: ParsedContext;
  status: ContactStatus;
  assignedTo: string;
  followUpDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  content: string;
  raw: string;
}

export interface ExtractedContact {
  type: SourceType;
  value: string;
  message: WhatsAppMessage;
  contextMessages: WhatsAppMessage[];
}

export interface ActivityLogEntry {
  id: string;
  contactId: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  performedBy: string;
  timestamp: string;
}

export interface ImportResult {
  totalMessages: number;
  contactsFound: number;
  duplicates: number;
  newContacts: ExtractedContact[];
  duplicateContacts: ExtractedContact[];
}

export interface AnalyticsData {
  totalContacts: number;
  byStatus: Record<ContactStatus, number>;
  byUrgency: Record<UrgencyLevel, number>;
  bySender: Record<string, number>;
  byMonth: { month: string; count: number }[];
  conversionFunnel: {
    new: number;
    contacted: number;
    inProgress: number;
    converted: number;
    passed: number;
  };
}
