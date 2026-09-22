import "server-only";
import { schema } from "@/lib/db";
import { scoreLead } from "@/lib/lead-score";

export const DEFAULT_STAGES = [
  { name: "Qualified", probability: 10, kind: "open" },
  { name: "Contact made", probability: 25, kind: "open" },
  { name: "Demo scheduled", probability: 40, kind: "open" },
  { name: "Proposal sent", probability: 60, kind: "open" },
  { name: "Negotiation", probability: 80, kind: "open" },
  { name: "Won", probability: 100, kind: "won" },
  { name: "Lost", probability: 0, kind: "lost" },
];

export async function createDefaultStages(db, orgId) {
  return db
    .insert(schema.stages)
    .values(DEFAULT_STAGES.map((s, i) => ({ ...s, orgId, position: i })))
    .returning();
}

// Small deterministic PRNG so demo data is stable per workspace.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const FIRST = ["Aarav", "Diya", "Rohan", "Ananya", "Kabir", "Isha", "Vihaan", "Meera", "Arjun", "Sara", "Neil", "Tara", "Dev", "Nisha", "Karan", "Riya", "Omar", "Leah", "Ethan", "Maya", "Liam", "Zara", "Noah", "Aisha"];
const LAST = ["Sharma", "Patel", "Iyer", "Reddy", "Kapoor", "Mehta", "Nair", "Gupta", "Khan", "Das", "Fernandes", "Rao", "Singh", "Bose", "Chen", "Miller", "Garcia", "Joshi"];
const COMPANIES = ["Northwind Labs", "Bluepeak Systems", "Saffron Retail", "Quantum Freight", "Orbit Health", "Lumen Finance", "Kestrel Media", "Terra Foods", "Nimbus Cloud", "Vertex Motors", "Helix Pharma", "Zenith Realty", "Aurora Travel", "Pinecrest Edu", "Cobalt Security", "Marigold Hotels", "Riverstone Legal", "Fable Studios", "Ironclad Build", "Sparrow Logistics", "Nova Textiles", "Atlas Energy", "Crescent Dental", "Evergreen Agro"];
const INDUSTRIES = ["SaaS", "Retail", "Logistics", "Healthcare", "Fintech", "Media", "Food & Bev", "Manufacturing", "Real estate", "Travel", "Education", "Security"];
const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai", "Dubai", "Singapore", "London", "Austin"];
const SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];
const SOURCES = ["Website", "Referral", "LinkedIn", "Cold outreach", "Event", "Google Ads", "Partner"];
const TITLES = ["CEO", "Founder", "Head of Sales", "CTO", "Ops Manager", "Marketing Lead", "Procurement", "VP Growth"];
const DEAL_KINDS = ["Annual license", "Pilot", "Expansion", "Onboarding package", "Enterprise plan", "Renewal", "Custom integration"];
const LOST_REASONS = ["Price too high", "Chose competitor", "No budget", "Timing", "No response"];
const TASKS = ["Follow up on proposal", "Send pricing deck", "Discovery call", "Product demo", "Check in after trial", "Share case study", "Contract review", "Intro to decision maker"];

const DAY = 86400000;

export async function seedDemoData(db, orgId, ownerId, stageRows) {
  const r = rng(orgId.split("-").join("").slice(0, 8).split("").reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const between = (a, b) => Math.floor(a + r() * (b - a));
  const now = Date.now();

  const companyRows = await db
    .insert(schema.companies)
    .values(
      COMPANIES.map((name) => ({
        orgId,
        ownerId,
        name,
        domain: name.toLowerCase().replace(/[^a-z]+/g, "") + ".com",
        industry: pick(INDUSTRIES),
        size: pick(SIZES),
        city: pick(CITIES),
        createdAt: new Date(now - between(60, 360) * DAY),
      }))
    )
    .returning();

  const contactValues = [];
  for (let i = 0; i < 56; i++) {
    const firstName = pick(FIRST);
    const lastName = pick(LAST);
    const company = companyRows[i % companyRows.length];
    contactValues.push({
      orgId,
      ownerId,
      companyId: company.id,
      firstName,
      lastName,
      email: `${firstName}.${lastName}@${company.domain}`.toLowerCase(),
      phone: `+91 9${between(100000000, 999999999)}`,
      title: pick(TITLES),
      source: pick(SOURCES),
      createdAt: new Date(now - between(5, 340) * DAY),
    });
  }
  const contactRows = await db.insert(schema.contacts).values(contactValues).returning();

  const leadValues = [];
  for (let i = 0; i < 42; i++) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    const status = pick(["new", "new", "contacted", "contacted", "qualified", "unqualified"]);
    leadValues.push({
      orgId,
      ownerId,
      name,
      email: `${name.split(" ")[0].toLowerCase()}@${pick(["gmail.com", "outlook.com", "startup.io", "corp.in"])}`,
      phone: `+91 8${between(100000000, 999999999)}`,
      companyName: `${pick(["Bright", "Swift", "Red", "Blue", "Prime", "Urban", "Clear"])} ${pick(["Works", "Labs", "Co", "Tech", "Studio", "Group"])}`,
      source: pick(SOURCES),
      status,
      estimatedValue: between(20, 600) * 1000,
      createdAt: new Date(now - between(0, 45) * DAY),
    });
    const lead = leadValues[leadValues.length - 1];
    if (r() < 0.25) lead.phone = null;
    lead.score = scoreLead(lead).score;
  }
  await db.insert(schema.leads).values(leadValues);

  const openStages = stageRows.filter((s) => s.kind === "open");
  const won = stageRows.find((s) => s.kind === "won");
  const lost = stageRows.find((s) => s.kind === "lost");

  const dealValues = [];
  for (let i = 0; i < 90; i++) {
    const contact = contactRows[i % contactRows.length];
    const createdDaysAgo = between(0, 365);
    const createdAt = new Date(now - createdDaysAgo * DAY);
    // Older deals are mostly closed; recent ones mostly open.
    const roll = r();
    const closed = createdDaysAgo > 40 ? roll < 0.85 : roll < 0.2;
    let stage = pick(openStages);
    let status = "open";
    let closedAt = null;
    if (closed) {
      const isWon = r() < 0.58;
      stage = isWon ? won : lost;
      status = isWon ? "won" : "lost";
      closedAt = new Date(createdAt.getTime() + between(7, Math.max(8, Math.min(60, createdDaysAgo))) * DAY);
      if (closedAt.getTime() > now) closedAt = new Date(now - between(0, 3) * DAY);
    }
    dealValues.push({
      orgId,
      ownerId,
      title: `${pick(DEAL_KINDS)} — ${companyRows.find((c) => c.id === contact.companyId)?.name}`,
      value: between(25, 900) * 1000,
      stageId: stage.id,
      status,
      contactId: contact.id,
      companyId: contact.companyId,
      source: pick(SOURCES),
      expectedClose: new Date(now + between(-10, 75) * DAY).toISOString().slice(0, 10),
      closedAt,
      lostReason: status === "lost" ? pick(LOST_REASONS) : null,
      createdAt,
    });
  }
  const dealRows = await db.insert(schema.deals).values(dealValues).returning();

  const openDeals = dealRows.filter((d) => d.status === "open");
  const activityValues = [];
  for (let i = 0; i < 70; i++) {
    const deal = pick(openDeals.length ? openDeals : dealRows);
    const past = r() < 0.55;
    const due = new Date(now + (past ? -between(0, 60) : between(0, 14)) * DAY + between(9, 18) * 3600000);
    const done = past && r() < 0.8;
    activityValues.push({
      orgId,
      ownerId,
      type: pick(["call", "call", "email", "meeting", "task"]),
      subject: pick(TASKS),
      dueAt: due,
      done,
      completedAt: done ? due : null,
      dealId: deal.id,
      contactId: deal.contactId,
      createdAt: new Date(due.getTime() - between(1, 5) * DAY),
    });
  }
  await db.insert(schema.activities).values(activityValues);
}
