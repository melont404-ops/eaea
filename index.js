import express from "express";
import puppeteer from "puppeteer";

const app = express();

function parseServerStateFromUrl(url) {
  try {
    const params = new URL(url).searchParams;
    let raw = params.get("serverState");
    if (!raw) return null;

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

app.get("/api/check", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res
      .status(400)
      .json({ success: false, error: "email parameter is required" });

  let browser;
  try {
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await page.goto("https://login.xfinity.com/login", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('input[id="user"]', { visible: true });
    await page.type('input[id="user"]', email, { delay: 50 });
    await page.click('button[type="submit"]');

    await new Promise((resolve) => setTimeout(resolve, 8000));

    const bodyText = await page.evaluate(() => {
      return document.body.innerText;
    });

    const htmlContent = await page.content();

    res.json({
      success: true,
      email,
      bodyText: bodyText,
      htmlContent: htmlContent,
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
