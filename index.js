import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/api/check", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
    });

    const title = await page.title();
    await browser.close();

    res.json({ success: true, title });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server running on", PORT);
});
