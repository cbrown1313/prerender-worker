import puppeteer from "@cloudflare/puppeteer";

const BOT_UA = [
  /Googlebot/i,
  /Google-InspectionTool/i,
  /Bingbot/i,
  /DuckDuckBot/i,
  /facebookexternalhit/i,
  /Twitterbot/i,
  /LinkedInBot/i,
  /Slackbot/i,
  /WhatsApp/i,
];

const ORIGIN = "https://smart-sites-360.lovable.app";

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

      let res = await cache.match(cacheKey);

      if (!res) {
        const browser = await puppeteer.launch(env.BROWSER);
        const page = await browser.newPage();

        await page.setUserAgent(ua);
        await page.goto(`${ORIGIN}${url.pathname}${url.search}`, {
          waitUntil: "networkidle0",
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

      return res;
    }

    return fetch(`${ORIGIN}${url.pathname}${url.search}`, req);
  }
};