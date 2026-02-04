import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/check", async (req, res) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.goto("https://example.com");

  res.json({ title: await page.title() });
  await browser.close();
});

app.listen(process.env.PORT || 3000);
