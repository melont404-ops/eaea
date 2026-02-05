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
    const launchOptions = {
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
      defaultViewport: null,
    };

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(0);

    await page.goto("https://www.netflix.com/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForSelector('input[name="email"]', { visible: true });
    await page.type('input[name="email"]', email, { delay: 50 });
    await page.waitForSelector('button[type="submit"]', { visible: true });
    await page.click('button[type="submit"]');

    await page.waitForFunction(
      () => {
        const text = document.body.innerText.toLowerCase();
        return (
          location.href.includes("signup") ||
          text.includes("something went wrong") ||
          text.includes("try again") ||
          text.includes("trouble")
        );
      },
      { timeout: 60000, polling: 500 },
    );

    const currentUrl = page.url();
    let result = "unknown";
    const parsedState = parseServerStateFromUrl(currentUrl);

    if (parsedState) {
      if (
        parsedState.name === "LOGIN" &&
        hasNested(parsedState, "sessionContext", "login.navigationSettings")
      ) {
        result = "invalid_signup";
      } else if (parsedState.name === "LOGIN") {
        result = "valid_login";
      }
    } else {
      const pageText = await page.evaluate(() =>
        document.body.innerText.toLowerCase(),
      );
      if (
        pageText.includes("something went wrong") ||
        pageText.includes("try again") ||
        pageText.includes("trouble")
      )
        result = "error";
    }

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
