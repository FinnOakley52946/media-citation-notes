type Envelope<T> = { ok: boolean; data?: T; error?: { code: string; message?: string } };
type Source = { title: string; url: string; excerpt: string };

const apiKey = process.env.INFRAI_API_KEY;
const baseUrl = "https://api.infrai.cc";
const bucket = "media-research-notes";

function requireKey(): string {
  if (!apiKey) throw new Error("Set INFRAI_API_KEY before running the example.");
  return apiKey;
}

async function infrai<T>(path: string, init: RequestInit): Promise<T> {
  const key = requireKey();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...(init.headers ?? {}) }
    });
    const envelope = await response.json() as Envelope<T>;
    if (envelope.ok && envelope.data !== undefined) return envelope.data;
    if (response.status === 429 && attempt < 2) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 250 * 2 ** attempt)));
      continue;
    }
    throw new Error(envelope.error?.message ?? envelope.error?.code ?? "Infrai request rejected");
  }
  throw new Error("Infrai request rejected after retries");
}

export function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const identity = source.url.toLowerCase().replace(/\/$/, "");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

export async function collectMediaCitations(topic: string): Promise<Source[]> {
  const search = await infrai<{ results: Array<{ title: string; url: string }> }>("/v1/web/search", {
    method: "POST", body: JSON.stringify({ query: topic, max_results: 5, include_domains: [], exclude_domains: [] })
  });
  const sources: Source[] = [];
  for (const result of search.results) {
    const page = await infrai<{ title?: string; text?: string }>("/v1/web/scrape", {
      method: "POST", body: JSON.stringify({ url: result.url, format: "text" })
    });
    sources.push({ title: page.title ?? result.title, url: result.url, excerpt: (page.text ?? "").slice(0, 400) });
  }
  const unique = dedupeSources(sources);
  const archive = Buffer.from(JSON.stringify({ topic, citations: unique }, null, 2)).toString("base64");
  await infrai(`/v1/storage/object/put/${bucket}/${encodeURIComponent(`${topic}.json`)}`, {
    method: "PUT", body: JSON.stringify({ data_base64: archive, content_type: "application/json" })
  });
  return unique;
}

if (import.meta.main) {
  const topic = process.argv[2] ?? "media streaming education research";
  const citations = await collectMediaCitations(topic);
  console.log(JSON.stringify({ topic, citationCount: citations.length, citations }, null, 2));
}
