// Transparent 0–100 lead score. Each factor is explainable in the UI.

const SOURCE_POINTS = {
  Referral: 25,
  Partner: 20,
  Event: 15,
  Website: 12,
  LinkedIn: 10,
  "Google Ads": 8,
  "Cold outreach": 5,
};

export function scoreLead(lead) {
  const factors = [];
  const add = (label, points) => points && factors.push({ label, points });

  add("Has email", lead.email ? 15 : 0);
  add("Has phone", lead.phone ? 10 : 0);
  add("Company known", lead.companyName ? 10 : 0);
  add(`Source: ${lead.source ?? "unknown"}`, SOURCE_POINTS[lead.source] ?? 0);

  const v = Number(lead.estimatedValue) || 0;
  add("Deal size", v >= 500000 ? 25 : v >= 200000 ? 18 : v >= 50000 ? 10 : v > 0 ? 5 : 0);

  if (lead.status === "contacted") add("Responded", 5);
  if (lead.status === "qualified") add("Qualified", 15);

  let score = factors.reduce((a, f) => a + f.points, 0);
  if (lead.status === "unqualified") score = Math.min(score, 20);
  return { score: Math.max(0, Math.min(100, score)), factors };
}

export function scoreTone(score) {
  if (score >= 70) return { label: "Hot", tone: "good" };
  if (score >= 40) return { label: "Warm", tone: "warn" };
  return { label: "Cold", tone: "neutral" };
}
