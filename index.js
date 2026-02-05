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

    page.setDefaultNavigationTimeout(0);

    await page.goto("https://www.netflix.com/", {
      waitUntil: "domcontentloaded",
    });

    await page.waitForSelector('input[name="email"]', {
      visible: true,
    });

    await page.type('input[name="email"]', email, { delay: 50 });

    await page.waitForSelector('button[type="submit"]', {
      visible: true,
    });

    await page.click('button[type="submit"]');

    // await page.waitForFunction(
    //   () => {
    //     const text = document.body.innerText.toLowerCase();
    //     return (
    //       location.href.includes("signup") ||
    //       text.includes("something went wrong") ||
    //       text.includes("try again") ||
    //       text.includes("trouble")
    //     );
    //   },
    //   { timeout: 60000, polling: 500 },
    // );

    const currentUrl = page.url();
    let result = "unknown";

    if (currentUrl.includes("serverState=")) {
      try {
        const params = new URL(currentUrl).searchParams;
        const serverStateRaw = params.get("serverState");

        if (serverStateRaw) {
          const decoded = decodeURIComponent(serverStateRaw);
          const state = JSON.parse(decoded);

          if (
            state?.name === "LOGIN" &&
            !state?.sessionContext?.["login.navigationSettings"]
          ) {
            result = "valid_login";
          } else if (
            state?.name === "LOGIN" &&
            state?.sessionContext?.["login.navigationSettings"]
          ) {
            result = "invalid_signup";
          }
        }
      } catch (e) {
        result = "unknown_state";
      }
    }

    if (result === "unknown") {
      const pageText = await page.evaluate(() =>
        document.body.innerText.toLowerCase(),
      );

      if (
        pageText.includes("something went wrong") ||
        pageText.includes("try again") ||
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
