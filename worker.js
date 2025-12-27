import puppeteer from "@cloudflare/puppeteer";

const BOT_UA = [
  // Search engines
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Bingbot/i,

  // AI / LLM crawlers
  /GPTBot/i,
  /ChatGPT-User/i,
  /ClaudeBot/i,
  /Google-Extended/i,
  /PerplexityBot/i,
  /Amazonbot/i,
  /meta-externalagent/i,

  // Social previews
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,

  // SEO tools
  /AhrefsBot/i,
  /SemrushBot/i,
  /MJ12bot/i,
  /Screaming Frog/i,
  /XML[- ]?Sitemaps/i,
];

const ORIGIN = "https://smart-sites-360.lovable.app";


function withDebugHeader(res, value) {
  const out = new Response(res.body, res);
  out.headers.set("x-worker", value);
  return out;
}


export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const ua = req.headers.get("user-agent") || "";
    const acceptsHtml = (req.headers.get("accept") || "").includes("text/html");

    const isBot = acceptsHtml && BOT_UA.some(re => re.test(ua));

    if (isBot) {
  const cache = caches.default;
  const cacheKey = new Request(req.url, {
    headers: { Accept: "text/html" }
  });

  let hit = true;
  let res = await cache.match(cacheKey);

  if (!res) {
    hit = false;

    const browser = await puppeteer.launch(env.BROWSER);
    const page = await browser.newPage();

    await page.setUserAgent(ua);
    await page.goto(`${ORIGIN}${url.pathname}${url.search}`, {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    const html = await page.content();
    await browser.close();

    res = new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=900, stale-while-revalidate=86400",
        "x-served-by": "cf-browser-rendering"
      }
    });

    ctx.waitUntil(cache.put(cacheKey, res.clone()));
  }

// Header check
  const debugRes = new Response(res.body, res);
  debugRes.headers.set("x-prerender", "1");
  debugRes.headers.set("x-prerender-cache", hit ? "HIT" : "MISS");

  return debugRes;
}

    return fetch(`${ORIGIN}${url.pathname}${url.search}`, req);
  }
};
