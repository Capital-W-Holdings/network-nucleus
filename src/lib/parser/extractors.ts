import { WhatsAppMessage, ExtractedContact, SourceType } from "@/types";
import { getContextWindow } from "./whatsapp";

// Regular expressions for contact extraction
const PATTERNS = {
  // LinkedIn profile or company page
  linkedin:
    /https?:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/([a-zA-Z0-9_-]+)\/?(?:\?[^\s]*)?/gi,

  // Email address
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,

  // Phone numbers - various international formats
  phone:
    /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}|\+[0-9]{1,4}[-.\s]?(?:\([0-9]{1,4}\)[-.\s]?)?[0-9]{1,4}[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/gi,

  // Generic URLs (excluding common non-portfolio sites)
  url: /https?:\/\/(?!(?:www\.)?(?:linkedin\.com|wa\.me|api\.whatsapp\.com|chat\.whatsapp\.com|youtube\.com|youtu\.be|twitter\.com|x\.com|facebook\.com|instagram\.com|tiktok\.com|google\.com|goo\.gl))[^\s<>"{}|\\^`\[\]]+/gi,
};

// Sites that are commonly portfolios or relevant
const PORTFOLIO_DOMAINS = [
  "github.com",
  "gitlab.com",
  "bitbucket.org",
  "dribbble.com",
  "behance.net",
  "medium.com",
  "dev.to",
  "notion.so",
  "notion.site",
  "substack.com",
  "wordpress.com",
  "wix.com",
  "squarespace.com",
  "about.me",
  "bio.link",
  "linktr.ee",
  "linktree.com",
  "calendly.com",
  "crunchbase.com",
  "angel.co",
  "wellfound.com",
  "pitchbook.com",
  "bloomberg.com",
];

function extractLinkedInProfile(url: string): {
  username: string;
  type: "profile" | "company";
} {
  const match = url.match(
    /linkedin\.com\/(in|company)\/([a-zA-Z0-9_-]+)/i
  );
  if (match) {
    return {
      type: match[1].toLowerCase() === "company" ? "company" : "profile",
      username: match[2],
    };
  }
  return { type: "profile", username: "" };
}

function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  return phone.replace(/(?!^\+)[^0-9]/g, "");
}

function isRelevantUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase().replace("www.", "");

    // Check if it's a known portfolio/professional domain
    if (PORTFOLIO_DOMAINS.some((d) => domain.includes(d))) {
      return true;
    }

    // Check if it looks like a personal/company website
    // (typically short domain, not a common social/utility site)
    const parts = domain.split(".");
    if (parts.length <= 3 && !domain.includes("bit.ly")) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

function deduplicateMatches(matches: string[]): string[] {
  const seen = new Set<string>();
  return matches.filter((match) => {
    const normalized = match.toLowerCase().replace(/\/$/, "");
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
}

export interface ExtractionResult {
  type: SourceType;
  value: string;
  normalized?: string;
  metadata?: Record<string, unknown>;
}

export function extractContactsFromMessage(
  content: string
): ExtractionResult[] {
  const results: ExtractionResult[] = [];

  // Extract LinkedIn URLs
  const linkedinMatches = content.match(PATTERNS.linkedin) || [];
  for (const url of deduplicateMatches(linkedinMatches)) {
    const { username, type } = extractLinkedInProfile(url);
    results.push({
      type: "linkedin",
      value: url,
      normalized: `https://linkedin.com/${type === "company" ? "company" : "in"}/${username}`,
      metadata: { username, profileType: type },
    });
  }

  // Extract email addresses
  const emailMatches = content.match(PATTERNS.email) || [];
  for (const email of deduplicateMatches(emailMatches)) {
    results.push({
      type: "email",
      value: email,
      normalized: email.toLowerCase(),
    });
  }

  // Extract phone numbers
  const phoneMatches = content.match(PATTERNS.phone) || [];
  for (const phone of deduplicateMatches(phoneMatches)) {
    const normalized = normalizePhoneNumber(phone);
    // Filter out numbers that are too short or too long
    if (normalized.length >= 10 && normalized.length <= 15) {
      results.push({
        type: "phone",
        value: phone,
        normalized,
      });
    }
  }

  // Extract other URLs (portfolios, websites)
  const urlMatches = content.match(PATTERNS.url) || [];
  for (const url of deduplicateMatches(urlMatches)) {
    if (isRelevantUrl(url)) {
      results.push({
        type: "other",
        value: url,
        normalized: url.replace(/\/$/, ""),
      });
    }
  }

  return results;
}

export function extractContactsFromChat(
  messages: WhatsAppMessage[],
  contextWindowSize: number = 3
): ExtractedContact[] {
  const contacts: ExtractedContact[] = [];
  const seenValues = new Set<string>();

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const extractions = extractContactsFromMessage(message.content);

    for (const extraction of extractions) {
      // Skip duplicates based on normalized value
      const key = `${extraction.type}:${extraction.normalized || extraction.value}`;
      if (seenValues.has(key)) {
        continue;
      }
      seenValues.add(key);

      // Get context window
      const contextMessages = getContextWindow(messages, i, contextWindowSize);

      contacts.push({
        type: extraction.type,
        value: extraction.normalized || extraction.value,
        message,
        contextMessages,
      });
    }
  }

  return contacts;
}

export function parseNameFromLinkedInUrl(url: string): string {
  const { username } = extractLinkedInProfile(url);
  if (!username) return "";

  // Convert kebab-case to title case
  return username
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
