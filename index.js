import express from "express";
import puppeteer from "puppeteer";

const app = express();

function parseServerStateFromUrl(url) {
  try {
    const params = new URL(url).searchParams;
    let raw = params.get("serverState");
    if (!raw) return null;

    // coba decode-parse satu atau dua kali
    let decoded = decodeURIComponent(raw);
    try {
      return JSON.parse(decoded);
    } catch (e) {}
    decoded = decodeURIComponent(decoded);
    return JSON.parse(decoded);
  } catch (e) {
    return null;
  }
}

function hasNested(obj, ...path) {
  let cur = obj;
  for (const p of path) {
    if (!cur || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

app.get("/api/check", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res
      .status(400)
      .json({ success: false, error: "email parameter is required" });

  let browser;
  try {
    // pilih library: bundled puppeteer jika di-set USE_FULL_PUPPETEER=true
    const puppeteerLib =
      process.env.USE_FULL_PUPPETEER === "true"
        ? (await import("puppeteer")).default
        : puppeteerCore;

    const CHROME_PATH = process.env.CHROME_PATH; // set via Dockerfile / env
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ],
      defaultViewport: null,
    };
    if (CHROME_PATH) launchOptions.executablePath = CHROME_PATH;

    browser = await puppeteerLib.launch(launchOptions);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await page.goto("https://www.netflix.com/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email, { delay: 50 });
    await page.waitForSelector('button[type="submit"]', { visible: true });
    await page.click('button[type="submit"]');

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const currentUrl = page.url();
    let result = "unknown";
    const parsedState = parseServerStateFromUrl(currentUrl);

    res.json({
      success: true,
      email,
      result,
      url: currentUrl,
      serverState: parsedState,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server running on", PORT));
