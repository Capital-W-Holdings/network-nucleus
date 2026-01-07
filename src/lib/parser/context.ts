import { WhatsAppMessage, ParsedContext, UrgencyLevel } from "@/types";

// Pattern matching dictionaries for context extraction
const RELATIONSHIP_PATTERNS = [
  { pattern: /my (?:good )?friend/i, value: "Friend" },
  { pattern: /close friend/i, value: "Close friend" },
  { pattern: /former colleague/i, value: "Former colleague" },
  { pattern: /ex[-\s]?colleague/i, value: "Former colleague" },
  { pattern: /colleague/i, value: "Colleague" },
  { pattern: /coworker|co-worker/i, value: "Coworker" },
  { pattern: /my (?:former )?boss/i, value: "Former boss" },
  { pattern: /investor I (?:met|know)/i, value: "Investor contact" },
  { pattern: /met (?:at|during|in)/i, value: "Met at event" },
  { pattern: /introduced by/i, value: "Referred by someone" },
  { pattern: /referral from/i, value: "Referral" },
  { pattern: /my partner/i, value: "Business partner" },
  { pattern: /business partner/i, value: "Business partner" },
  { pattern: /client/i, value: "Client" },
  { pattern: /founder of/i, value: "Founder" },
  { pattern: /CEO of|CTO of|CFO of/i, value: "Executive" },
  { pattern: /works at|working at/i, value: "Works at company" },
  { pattern: /family/i, value: "Family connection" },
  { pattern: /classmate/i, value: "Classmate" },
  { pattern: /alumni/i, value: "Alumni" },
  { pattern: /mentor/i, value: "Mentor" },
  { pattern: /advisor/i, value: "Advisor" },
];

const REASON_PATTERNS = [
  { pattern: /looking for funding/i, value: "Seeking funding" },
  { pattern: /raising (?:a )?(?:round|capital|money)/i, value: "Raising capital" },
  { pattern: /fundrais(?:e|ing)/i, value: "Fundraising" },
  { pattern: /seeking investment/i, value: "Seeking investment" },
  { pattern: /wants to connect/i, value: "Networking" },
  { pattern: /potential LP/i, value: "Potential LP" },
  { pattern: /potential investor/i, value: "Potential investor" },
  { pattern: /interested in (?:our|the) fund/i, value: "Fund interest" },
  { pattern: /deal flow/i, value: "Deal flow" },
  { pattern: /co-invest/i, value: "Co-investment opportunity" },
  { pattern: /partnership/i, value: "Partnership opportunity" },
  { pattern: /hiring|looking to hire/i, value: "Hiring" },
  { pattern: /job opportunity/i, value: "Job opportunity" },
  { pattern: /should meet|worth meeting/i, value: "Recommended meeting" },
  { pattern: /intro(?:duction)?/i, value: "Introduction request" },
  { pattern: /check (?:this|them) out/i, value: "Review recommended" },
  { pattern: /great company/i, value: "Company recommendation" },
  { pattern: /interesting (?:company|startup|opportunity)/i, value: "Interesting opportunity" },
  { pattern: /portfolio company/i, value: "Portfolio company" },
  { pattern: /acquisition target/i, value: "Acquisition target" },
  { pattern: /exit(?:ing|ed)?/i, value: "Exit-related" },
  { pattern: /selling/i, value: "Selling" },
  { pattern: /buying/i, value: "Buying" },
  { pattern: /due diligence/i, value: "Due diligence" },
];

const SECTOR_PATTERNS = [
  { pattern: /fintech/i, value: "Fintech" },
  { pattern: /healthtech|health tech|healthcare/i, value: "Healthtech" },
  { pattern: /edtech|ed tech|education/i, value: "Edtech" },
  { pattern: /proptech|prop tech|real estate tech/i, value: "Proptech" },
  { pattern: /climate tech|cleantech|clean tech/i, value: "Climate Tech" },
  { pattern: /(?:artificial intelligence|AI|machine learning|ML)/i, value: "AI/ML" },
  { pattern: /saas|SaaS/i, value: "SaaS" },
  { pattern: /b2b/i, value: "B2B" },
  { pattern: /b2c/i, value: "B2C" },
  { pattern: /marketplace/i, value: "Marketplace" },
  { pattern: /e-?commerce/i, value: "E-commerce" },
  { pattern: /crypto|blockchain|web3/i, value: "Crypto/Web3" },
  { pattern: /biotech|bio tech/i, value: "Biotech" },
  { pattern: /deep tech/i, value: "Deep Tech" },
  { pattern: /enterprise/i, value: "Enterprise" },
  { pattern: /consumer/i, value: "Consumer" },
  { pattern: /mobile/i, value: "Mobile" },
  { pattern: /gaming/i, value: "Gaming" },
  { pattern: /media|content/i, value: "Media/Content" },
  { pattern: /logistics|supply chain/i, value: "Logistics" },
  { pattern: /food tech|foodtech/i, value: "Foodtech" },
  { pattern: /insur(?:ance)?tech/i, value: "Insurtech" },
  { pattern: /legal tech|legaltech/i, value: "Legaltech" },
  { pattern: /hr tech|hrtech/i, value: "HR Tech" },
  { pattern: /devtools|developer tools/i, value: "Developer Tools" },
  { pattern: /security|cybersecurity/i, value: "Security" },
  { pattern: /infrastructure/i, value: "Infrastructure" },
  { pattern: /data/i, value: "Data" },
];

const DEAL_SIZE_PATTERNS = [
  { pattern: /\$\s*(\d+(?:\.\d+)?)\s*[Mm](?:illion|M|m)?/i, extract: true },
  { pattern: /\$\s*(\d+(?:\.\d+)?)\s*[Bb](?:illion|B|b)?/i, extract: true, multiplier: 1000 },
  { pattern: /(\d+(?:\.\d+)?)\s*[Mm](?:illion|M|m)?\s*(?:round|raise|raising)/i, extract: true },
  { pattern: /series\s*[A-F]/i, value: "Series round" },
  { pattern: /seed(?:\s*round)?/i, value: "Seed" },
  { pattern: /pre-?seed/i, value: "Pre-seed" },
  { pattern: /series\s*A/i, value: "Series A" },
  { pattern: /series\s*B/i, value: "Series B" },
  { pattern: /series\s*C/i, value: "Series C" },
  { pattern: /growth(?:\s*round)?/i, value: "Growth" },
  { pattern: /bridge(?:\s*round)?/i, value: "Bridge" },
];

const URGENCY_INDICATORS = {
  hot: [
    /urgent/i,
    /ASAP/i,
    /time sensitive/i,
    /hot intro/i,
    /hot deal/i,
    /closing soon/i,
    /deadline/i,
    /immediately/i,
    /today/i,
    /now/i,
    /priority/i,
    /!{2,}/,
    /please.*?asap/i,
    /URGENT/,
    /HOT/,
  ],
  warm: [
    /when you (?:can|get a chance)/i,
    /soon/i,
    /this week/i,
    /interested/i,
    /would be great/i,
    /should connect/i,
    /worth a look/i,
    /check it out/i,
    /important/i,
  ],
  cold: [
    /whenever/i,
    /no rush/i,
    /fyi/i,
    /FYI/i,
    /for your info/i,
    /just sharing/i,
    /thought you.d like/i,
    /might be interesting/i,
    /keep in mind/i,
  ],
};

function extractMatchingValue(
  text: string,
  patterns: Array<{ pattern: RegExp; value?: string; extract?: boolean; multiplier?: number }>
): string {
  for (const { pattern, value, extract, multiplier } of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (extract && match[1]) {
        const num = parseFloat(match[1]);
        const finalNum = multiplier ? num * multiplier : num;
        return `$${finalNum}M`;
      }
      return value || match[0];
    }
  }
  return "";
}

function extractAllMatchingValues(
  text: string,
  patterns: Array<{ pattern: RegExp; value: string }>
): string[] {
  const matches: string[] = [];
  for (const { pattern, value } of patterns) {
    if (pattern.test(text)) {
      matches.push(value);
    }
  }
  return [...new Set(matches)]; // Deduplicate
}

function detectUrgency(text: string): UrgencyLevel {
  // Check for hot indicators first
  for (const pattern of URGENCY_INDICATORS.hot) {
    if (pattern.test(text)) {
      return "hot";
    }
  }

  // Then warm
  for (const pattern of URGENCY_INDICATORS.warm) {
    if (pattern.test(text)) {
      return "warm";
    }
  }

  // Then cold
  for (const pattern of URGENCY_INDICATORS.cold) {
    if (pattern.test(text)) {
      return "cold";
    }
  }

  // Default to warm if no specific indicators
  return "warm";
}

// Extract meaningful notes from context (messages after the link)
function extractNotes(contextMessages: WhatsAppMessage[], linkMessageIndex: number): string {
  const notes: string[] = [];

  // Get messages after the link (follow-up context)
  const followUpMessages = contextMessages.slice(linkMessageIndex + 1);

  for (const msg of followUpMessages) {
    const content = msg.content.trim();

    // Skip very short messages, media placeholders, and links
    if (content.length < 5) continue;
    if (/^<.*omitted>$/i.test(content)) continue;
    if (/^https?:\/\//i.test(content)) continue;

    // Skip messages that are just reactions or acknowledgements
    if (/^(ok|okay|thanks|thank you|got it|nice|cool|great|👍|🙏|✅)$/i.test(content)) continue;

    // This looks like a meaningful note about the person
    notes.push(content);
  }

  // Also check the message with the link for inline notes
  if (linkMessageIndex >= 0 && linkMessageIndex < contextMessages.length) {
    const linkMsg = contextMessages[linkMessageIndex];
    // Extract text that comes after the URL
    const afterUrl = linkMsg.content.replace(/https?:\/\/[^\s]+/g, "").trim();
    if (afterUrl.length > 10) {
      notes.unshift(afterUrl); // Add at beginning since it's from the same message
    }
  }

  // Check messages before the link for context
  const beforeMessages = contextMessages.slice(0, linkMessageIndex);
  for (const msg of beforeMessages.slice(-2)) { // Last 2 messages before link
    const content = msg.content.trim();
    if (content.length > 15 && !content.includes("http")) {
      // Looks like context about who they're sharing
      notes.unshift(content);
    }
  }

  return notes.slice(0, 5).join("\n"); // Limit to 5 notes
}

export function analyzeContext(contextMessages: WhatsAppMessage[]): ParsedContext {
  // Combine all context messages into one text block
  const contextText = contextMessages.map((m) => m.content).join("\n");

  // Find which message contains the link (usually the middle one)
  const linkMessageIndex = contextMessages.findIndex(m =>
    /linkedin\.com|https?:\/\//.test(m.content)
  );

  // Extract relationship
  const relationships = extractAllMatchingValues(contextText, RELATIONSHIP_PATTERNS);
  const relationship = relationships.length > 0 ? relationships[0] : "";

  // Extract reason for sharing
  const reasons = extractAllMatchingValues(contextText, REASON_PATTERNS);
  const reason = reasons.length > 0 ? reasons[0] : "";

  // Extract sector/industry
  const sectors = extractAllMatchingValues(contextText, SECTOR_PATTERNS);
  const sector = sectors.join(", ");

  // Extract deal size
  const dealSize = extractMatchingValue(contextText, DEAL_SIZE_PATTERNS);

  // Detect urgency
  const urgency = detectUrgency(contextText);

  // Extract notes from context messages
  const notes = extractNotes(contextMessages, linkMessageIndex >= 0 ? linkMessageIndex : Math.floor(contextMessages.length / 2));

  return {
    relationship,
    reason,
    sector,
    dealSize,
    urgency,
    notes,
  };
}

export function formatRawContext(contextMessages: WhatsAppMessage[]): string {
  return contextMessages
    .map((m) => {
      const dateStr = m.timestamp.toLocaleString();
      return `[${dateStr}] ${m.sender}: ${m.content}`;
    })
    .join("\n");
}
