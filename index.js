import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/check", async (req, res) => {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.goto("https://example.com");

    const title = await page.title();
    res.json({ success: true, title });
  } catch (e) {
    res.status(500).json({ error: e.message });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("running"));
