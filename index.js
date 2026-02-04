import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/api/check", async (req, res) => {
  const { email } = req.query;

  // 1️⃣ validasi email
  if (!email) {
    return res.status(400).json({
      success: false,
      error: "email parameter is required",
    });
  }

  try {
    // 2️⃣ launch browser
    const browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    // optional: biar cepat
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "stylesheet", "font"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 3️⃣ contoh logic pakai email
    await page.goto("https://example.com", {
      waitUntil: "domcontentloaded",
    });

    const title = await page.title();

    await browser.close();

    // 4️⃣ response sukses
    res.json({
      success: true,
      email,
      title,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server running on", PORT);
});
