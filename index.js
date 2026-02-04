import express from "express";
import puppeteer from "puppeteer";

const app = express();

app.get("/api/check", async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: "email parameter is required",
    });
  }

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();

    // biar gak timeout Netflix
    page.setDefaultNavigationTimeout(0);

    // open Netflix
    await page.goto("https://www.netflix.com/", {
      waitUntil: "domcontentloaded",
    });

    // 1️⃣ tunggu input email
    await page.waitForSelector('input[name="email"]', {
      visible: true,
    });

    // 2️⃣ ketik email
    await page.type('input[name="email"]', email, { delay: 50 });

    // 3️⃣ tunggu tombol submit
    await page.waitForSelector('button[type="submit"]', {
      visible: true,
    });

    // klik tombol
    await page.click('button[type="submit"]');

    // tunggu salah satu: navigation ATAU error text
    await Promise.race([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      page.waitForFunction(
        () =>
          document.body.innerText.includes("Something went wrong") ||
          document.body.innerText.includes("Try again") ||
          document.body.innerText.includes("trouble"),
      ),
    ]);

    const currentUrl = page.url();
    let result = "unknown";

    // 1️⃣ redirect signup
    if (currentUrl.includes("/signup")) {
      result = "invalid_signup";
    }

    // 2️⃣ redirect login
    else if (currentUrl.includes("/login")) {
      result = "valid_login";
    }

    // 3️⃣ error message
    else {
      const pageText = await page.evaluate(() => document.body.innerText);

      if (
        pageText.includes("Something went wrong") ||
        pageText.includes("Try again") ||
        pageText.includes("trouble")
      ) {
        result = "error";
      }
    }

    res.json({
      success: true,
      email,
      result,
      url: currentUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("server running on", PORT);
});
