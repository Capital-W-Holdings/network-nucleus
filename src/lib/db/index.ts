import Dexie, { type EntityTable } from "dexie";
import { Contact, ActivityLogEntry } from "@/types";

// Define the database
const db = new Dexie("NetworkNucleusDB") as Dexie & {
  contacts: EntityTable<Contact, "id">;
  activityLog: EntityTable<ActivityLogEntry, "id">;
};

// Define schema
db.version(1).stores({
  contacts:
    "id, linkedinUrl, sourceType, sharedBy, status, createdAt, updatedAt, [status+sharedBy], [status+createdAt]",
  activityLog: "id, contactId, timestamp, [contactId+timestamp]",
});

export { db };

// Contact operations
export async function addContact(contact: Contact): Promise<string> {
  return db.contacts.add(contact);
}

export async function addContacts(contacts: Contact[]): Promise<void> {
  await db.contacts.bulkAdd(contacts);
}

export async function updateContact(
  id: string,
  updates: Partial<Contact>
): Promise<void> {
  await db.contacts.update(id, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteContact(id: string): Promise<void> {
  await db.contacts.delete(id);
}

export async function deleteContacts(ids: string[]): Promise<void> {
  await db.contacts.bulkDelete(ids);
}

export async function getContact(id: string): Promise<Contact | undefined> {
  return db.contacts.get(id);
}

export async function getAllContacts(): Promise<Contact[]> {
  return db.contacts.orderBy("createdAt").reverse().toArray();
}

export async function getContactsByStatus(status: string): Promise<Contact[]> {
  return db.contacts.where("status").equals(status).toArray();
}

export async function getContactsBySharedBy(
  sharedBy: string
): Promise<Contact[]> {
  return db.contacts.where("sharedBy").equals(sharedBy).toArray();
}

export async function findContactByLinkedIn(
  linkedinUrl: string
): Promise<Contact | undefined> {
  return db.contacts.where("linkedinUrl").equals(linkedinUrl).first();
}

export async function checkDuplicates(
  linkedinUrls: string[]
): Promise<Set<string>> {
  const existing = await db.contacts
    .where("linkedinUrl")
    .anyOf(linkedinUrls)
    .toArray();
  return new Set(existing.map((c) => c.linkedinUrl));
}

export async function getUniqueSharedBy(): Promise<string[]> {
  const contacts = await db.contacts.toArray();
  return [...new Set(contacts.map((c) => c.sharedBy))].sort();
}

export async function getContactsCount(): Promise<number> {
  return db.contacts.count();
}

export async function getContactsByDateRange(
  startDate: string,
  endDate: string
): Promise<Contact[]> {
  return db.contacts
    .where("createdAt")
    .between(startDate, endDate)
    .toArray();
}

// Activity log operations
export async function addActivityLog(entry: ActivityLogEntry): Promise<void> {
  await db.activityLog.add(entry);
}

export async function getActivityLogForContact(
  contactId: string
): Promise<ActivityLogEntry[]> {
  return db.activityLog
    .where("contactId")
    .equals(contactId)
    .reverse()
    .sortBy("timestamp");
}

export async function logContactUpdate(
  contactId: string,
  field: string,
  oldValue: string,
  newValue: string,
  performedBy: string = "User"
): Promise<void> {
  await addActivityLog({
    id: crypto.randomUUID(),
    contactId,
    action: "updated",
    field,
    oldValue,
    newValue,
    performedBy,
    timestamp: new Date().toISOString(),
  });
}

export async function logContactCreated(
  contactId: string,
  performedBy: string = "User"
): Promise<void> {
  await addActivityLog({
    id: crypto.randomUUID(),
    contactId,
    action: "created",
    performedBy,
    timestamp: new Date().toISOString(),
  });
}

// Analytics queries
export async function getAnalyticsData() {
  const contacts = await getAllContacts();

  const byStatus: Record<string, number> = {
    new: 0,
    contacted: 0,
    in_progress: 0,
    converted: 0,
    passed: 0,
  };

  const byUrgency: Record<string, number> = {
    hot: 0,
    warm: 0,
    cold: 0,
  };

  const bySender: Record<string, number> = {};
  const byMonth: Record<string, number> = {};

  for (const contact of contacts) {
    // Count by status
    byStatus[contact.status] = (byStatus[contact.status] || 0) + 1;

    // Count by urgency
    byUrgency[contact.parsedContext.urgency] =
      (byUrgency[contact.parsedContext.urgency] || 0) + 1;

    // Count by sender
    bySender[contact.sharedBy] = (bySender[contact.sharedBy] || 0) + 1;

    // Count by month
    const month = contact.createdAt.substring(0, 7); // YYYY-MM
    byMonth[month] = (byMonth[month] || 0) + 1;
  }

  // Convert byMonth to array sorted by date
  const byMonthArray = Object.entries(byMonth)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return {
    totalContacts: contacts.length,
    byStatus,
    byUrgency,
    bySender,
    byMonth: byMonthArray,
    conversionFunnel: {
      new: byStatus.new,
      contacted: byStatus.contacted,
      inProgress: byStatus.in_progress,
      converted: byStatus.converted,
      passed: byStatus.passed,
    },
  };
}

// Clear all data
export async function clearAllData(): Promise<void> {
  await db.contacts.clear();
  await db.activityLog.clear();
}
