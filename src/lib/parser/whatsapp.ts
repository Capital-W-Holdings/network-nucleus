import { WhatsAppMessage } from "@/types";

// WhatsApp export formats can vary by device/locale
// Common patterns:
// [1/6/25, 10:30:45 AM] John Doe: Message
// [01/06/2025, 10:30] John Doe: Message
// 1/6/25, 10:30 AM - John Doe: Message
// [6/1/25, 10:30:45] John Doe: Message

const MESSAGE_PATTERNS = [
  // Pattern 1: [MM/DD/YY, HH:MM:SS AM/PM] Sender: Message
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\]\s*([^:]+):\s*(.+)$/s,
  // Pattern 2: MM/DD/YY, HH:MM AM/PM - Sender: Message
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)\s*-\s*([^:]+):\s*(.+)$/s,
  // Pattern 3: [DD/MM/YYYY, HH:MM:SS] Sender: Message (24-hour format)
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s*(\d{1,2}:\d{2}(?::\d{2})?)\]\s*([^:]+):\s*(.+)$/s,
];

const MEDIA_PLACEHOLDERS = [
  "<Media omitted>",
  "<image omitted>",
  "<video omitted>",
  "<audio omitted>",
  "<document omitted>",
  "<sticker omitted>",
  "<GIF omitted>",
  "<Contact card omitted>",
  "image omitted",
  "video omitted",
  "audio omitted",
];

const SYSTEM_MESSAGES = [
  "Messages and calls are end-to-end encrypted",
  "created group",
  "added you",
  "left",
  "removed",
  "changed the subject",
  "changed this group's icon",
  "changed the group description",
  "Your security code with",
];

function parseDate(dateStr: string, timeStr: string): Date {
  // Handle various date formats
  const dateParts = dateStr.split("/");
  let month: number, day: number, year: number;

  // Assume MM/DD/YY or DD/MM/YY format
  // We'll use MM/DD/YY as default (US format common in WhatsApp)
  if (dateParts.length === 3) {
    month = parseInt(dateParts[0], 10);
    day = parseInt(dateParts[1], 10);
    year = parseInt(dateParts[2], 10);

    // Convert 2-digit year to 4-digit
    if (year < 100) {
      year += year > 50 ? 1900 : 2000;
    }
  } else {
    return new Date();
  }

  // Parse time
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AP]M)?/i);
  if (timeMatch) {
    hours = parseInt(timeMatch[1], 10);
    minutes = parseInt(timeMatch[2], 10);
    seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

    // Handle AM/PM
    if (timeMatch[4]) {
      const isPM = timeMatch[4].toUpperCase() === "PM";
      if (isPM && hours !== 12) {
        hours += 12;
      } else if (!isPM && hours === 12) {
        hours = 0;
      }
    }
  }

  return new Date(year, month - 1, day, hours, minutes, seconds);
}

function isMediaPlaceholder(content: string): boolean {
  return MEDIA_PLACEHOLDERS.some((placeholder) =>
    content.toLowerCase().includes(placeholder.toLowerCase())
  );
}

function isSystemMessage(content: string): boolean {
  return SYSTEM_MESSAGES.some((msg) =>
    content.toLowerCase().includes(msg.toLowerCase())
  );
}

export function parseWhatsAppChat(content: string): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  const lines = content.split("\n");

  let currentMessage: WhatsAppMessage | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let matched = false;

    // Try each message pattern
    for (const pattern of MESSAGE_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // Save previous message if exists
        if (currentMessage) {
          messages.push(currentMessage);
        }

        const [, dateStr, timeStr, sender, messageContent] = match;
        const timestamp = parseDate(dateStr, timeStr);

        // Skip media placeholders and system messages
        if (
          !isMediaPlaceholder(messageContent) &&
          !isSystemMessage(messageContent)
        ) {
          currentMessage = {
            timestamp,
            sender: sender.trim(),
            content: messageContent.trim(),
            raw: line,
          };
        } else {
          currentMessage = null;
        }

        matched = true;
        break;
      }
    }

    // If no pattern matched, this is a continuation of the previous message
    if (!matched && currentMessage && line.trim()) {
      currentMessage.content += "\n" + line;
      currentMessage.raw += "\n" + line;
    }
  }

  // Don't forget the last message
  if (currentMessage) {
    messages.push(currentMessage);
  }

  return messages;
}

export function getContextWindow(
  messages: WhatsAppMessage[],
  targetIndex: number,
  windowSize: number = 3
): WhatsAppMessage[] {
  const start = Math.max(0, targetIndex - windowSize);
  const end = Math.min(messages.length, targetIndex + windowSize + 1);
  return messages.slice(start, end);
}
