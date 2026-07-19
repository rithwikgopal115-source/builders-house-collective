// ai-news-agent — Builders House
// Crawls AI news RSS feeds, deduplicates, writes punchy builder blurbs via Gemini,
// and auto-posts to the ai-news channel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── RSS feeds to crawl ───────────────────────────────────────────────────────
const RSS_FEEDS = [
  { name: "TechCrunch AI",        url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { name: "MIT Tech Review AI",   url: "https://www.technologyreview.com/feed/" },
  { name: "VentureBeat AI",       url: "https://venturebeat.com/category/ai/feed/" },
  { name: "The Decoder",          url: "https://the-decoder.com/feed/" },
  { name: "Hugging Face Blog",    url: "https://huggingface.co/blog/feed.xml" },
  { name: "AI News",              url: "https://www.artificialintelligence-news.com/feed/" },
];

// Bot profile UUID — must exist in profiles table
const BOT_USER_ID = "00000000-0000-0000-0000-000000000001";

// ─── Types ────────────────────────────────────────────────────────────────────
interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
}

// ─── XML parser (no DOM in Deno edge runtime) ─────────────────────────────────
function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, "i").exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(xml);
  return match ? match[1].replace(/<[^>]+>/g, "").trim() : "";
}

function parseRss(xml: string, sourceName: string): RssItem[] {
  const items: RssItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractTag(block, "title");
    const link  = extractTag(block, "link") || extractTag(block, "guid");
    const description = extractTag(block, "description") || extractTag(block, "summary");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || new Date().toISOString();
    if (title && link) {
      items.push({ title, link: link.trim(), description: description.slice(0, 500), pubDate, source: sourceName });
    }
  }
  return items;
}

// ─── Gemini blurb writer ──────────────────────────────────────────────────────
async function writeBlurb(item: RssItem, geminiKey: string): Promise<string> {
  const prompt = `You're writing for Builders House — a tight-knit founder community. 
Write a 2-3 sentence punchy take on this AI news story for builders/founders. 
Be direct, no fluff, no hype. Show why it matters to someone building a startup.
End with what action or question this raises.

Story title: ${item.title}
Summary: ${item.description}
Source: ${item.source}

Keep it under 200 characters. No emojis. No "This article..."`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 120, temperature: 0.7 },
        }),
      }
    );
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  } catch {
    return "";
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL      = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const GEMINI_API_KEY    = Deno.env.get("GEMINI_API_KEY") ?? "";

    const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // ── Check agent is enabled ────────────────────────────────────────────────
    const { data: settings } = await db
      .from("admin_settings")
      .select("ai_news_agent_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (settings?.ai_news_agent_enabled === false) {
      return json({ ok: true, skipped: true, reason: "agent is disabled" });
    }

    // ── Get the ai-news channel id ────────────────────────────────────────────
    const { data: channel } = await db
      .from("channels")
      .select("id")
      .eq("slug", "ai-news")
      .maybeSingle();

    if (!channel?.id) return json({ error: "ai-news channel not found" }, 404);

    // ── Load already-posted URLs to deduplicate ───────────────────────────────
    const { data: posted } = await db
      .from("ai_news_posted")
      .select("url");
    const postedUrls = new Set((posted ?? []).map((p: any) => p.url));

    // ── Fetch RSS feeds ───────────────────────────────────────────────────────
    const allItems: RssItem[] = [];
    await Promise.all(
      RSS_FEEDS.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: { "User-Agent": "BuildersHouse-AIScout/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const items = parseRss(xml, feed.name);
          allItems.push(...items);
        } catch (e) {
          console.warn(`Failed to fetch ${feed.name}:`, e);
        }
      })
    );

    // ── Deduplicate + pick fresh items (max 5 per run to avoid spam) ──────────
    const fresh = allItems
      .filter((item) => !postedUrls.has(item.link))
      .slice(0, 5);

    if (fresh.length === 0) {
      return json({ ok: true, posted: 0, reason: "no new stories found" });
    }

    // ── Write blurbs + post to Supabase ───────────────────────────────────────
    let postedCount = 0;
    for (const item of fresh) {
      let content = "";
      if (GEMINI_API_KEY) {
        content = await writeBlurb(item, GEMINI_API_KEY);
      }

      // Fallback: use raw description snippet if no Gemini key
      if (!content) {
        content = item.description.slice(0, 280) || item.title;
      }

      // Insert post
      const { error: postErr } = await db.from("posts").insert({
        channel_id:  channel.id,
        user_id:     BOT_USER_ID,
        title:       item.title,
        content,
        type:        "link",
        url:         item.link,
        visibility:  "community",
        is_resource: false,
        is_pinned:   false,
      });

      if (postErr) {
        console.error("Failed to insert post:", postErr.message);
        continue;
      }

      // Mark URL as posted to prevent duplicates
      await db.from("ai_news_posted").insert({ url: item.link });
      postedCount++;
    }

    // Update last run timestamp in admin_settings
    await db
      .from("admin_settings")
      .update({ ai_news_last_run: new Date().toISOString() })
      .eq("id", 1);

    return json({ ok: true, posted: postedCount, total_fresh: fresh.length });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
