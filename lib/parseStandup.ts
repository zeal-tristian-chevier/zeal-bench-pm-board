export type ParsedTask = {
  memberName: string;
  title: string;
  projectName: string | null;
};

type ProjectRule = {
  name: string;
  keywords: RegExp[];
};

const PROJECT_RULES: ProjectRule[] = [
  { name: "Zeal Navigator", keywords: [/zeal navigator/i, /navigator/i] },
  { name: "Zeal OS", keywords: [/zeal os/i] },
  { name: "Inspire Brands (Dunkin')", keywords: [/inspire brands/i, /dunkin/i] },
  { name: "McKesson", keywords: [/mckesson/i] },
  { name: "Palantir", keywords: [/palantir/i] },
  { name: "Squad Board (Claude)", keywords: [/squad board/i, /claude/i, /mcp/i, /trello/i] },
  { name: "LinkedIn Outreach", keywords: [/linkedin/i, /outreach/i] },
  { name: "Great Place to Work", keywords: [/great place to work/i, /gptw/i] },
  { name: "Azure AI Fundamentals", keywords: [/azure ai/i, /azure/i] },
  { name: "AWS Cloud Practitioner", keywords: [/aws cloud/i, /aws/i] },
  { name: "Flutter", keywords: [/flutter/i] },
  { name: "Rippling", keywords: [/rippling/i] },
  { name: "Microsoft Training", keywords: [/microsoft training/i, /microsoft/i] },
  { name: "Scout Training", keywords: [/scout/i] },
  { name: "AI Leadership Certification", keywords: [/ai leadership/i] },
  { name: "Captain's Leadership Training", keywords: [/captain/i, /leadership training/i] },
  { name: "Hub Work", keywords: [/hub work/i, /\bhub\b/i] },
  { name: "Bench / Internal", keywords: [/bench/i, /standup/i] },
];

export function parseStandup(raw: string): ParsedTask[] {
  const out: ParsedTask[] = [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    const clean = line.replace(/^[-•*\u2022]\s*/, "");
    const m =
      clean.match(/^([^—–]+?)\s*[—–]\s*(.+)$/) ||
      clean.match(/^([^-]{2,}?)\s*-\s*(.+)$/);
    if (!m) continue;
    const memberName = m[1].trim();
    const rest = m[2].trim().replace(/\.$/, "");
    const phrases = rest
      .split(/\s*;\s*/)
      .flatMap((p) => p.split(/(?<=[a-z0-9\)])\.\s+(?=[A-Z])/))
      .map((p) => p.trim())
      .filter(Boolean);

    for (const phrase of phrases) {
      const title = normalizeTitle(phrase);
      if (!title) continue;
      out.push({
        memberName,
        title,
        projectName: matchProject(title),
      });
    }
  }
  return out;
}

function normalizeTitle(s: string): string {
  return s
    .replace(/\.+$/, "")
    .replace(/\s+/g, " ")
    .replace(/^(and|will|is|was)\s+/i, "")
    .trim();
}

function matchProject(text: string): string | null {
  for (const rule of PROJECT_RULES) {
    for (const re of rule.keywords) {
      if (re.test(text)) return rule.name;
    }
  }
  return null;
}
