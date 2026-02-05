import express from "express";
import puppeteer from "puppeteer-core";

const app = express();

const CHROME_PATH = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

app.get("/api/check", async (req, res) => {
  const { email } = req.query;
  if (!email)
    return res.status(400).json({ success: false, error: "email required" });

  let browser;
  try {
    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
      ],
      defaultViewport: { width: 1280, height: 800 },
    });

    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await page.goto("https://www.netflix.com/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email, { delay: 50 });
    await page.click('button[type="submit"]');
    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          location.href.includes("signup") ||
          text.includes("something went wrong")
        );
      },
      { timeout: 60000, polling: 500 },
    );

    res.json({ success: true, email, url: page.url() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("server running on", PORT));
