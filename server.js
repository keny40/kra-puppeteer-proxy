// server.js — Render + Puppeteer KRA Proxy

const express = require("express");
const cors = require("cors");
const puppeteer = require("puppeteer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let browser;

// 브라우저 인스턴스 재사용
async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage"
    ]
  });

  return browser;
}

// 공통 크롤링 함수
async function fetchWithPuppeteer(targetUrl) {
  const browser = await getBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 12; SM-G998N) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36"
  );

  await page.setExtraHTTPHeaders({
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://m.kra.co.kr/",
  });

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000
    });

    const headers = response.headers();
    const contentType = headers["content-type"] || "";

    const text = await response.text();
    let body = text;
    let isJson = false;

    if (contentType.includes("application/json")) {
      try {
        body = JSON.parse(text);
        isJson = true;
      } catch (e) {
        // JSON 파싱 실패하면 그냥 text 반환
      }
    }

    await page.close();

    return {
      status: response.status(),
      body,
      isJson,
      contentType
    };
  } catch (err) {
    await page.close().catch(() => {});
    throw err;
  }
}

// 헬스체크용
app.get("/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// 오늘의 경주 정보
app.get("/today", async (req, res) => {
  const url = "https://m.kra.co.kr/py/api/todayRaceInfo";

  try {
    const result = await fetchWithPuppeteer(url);
    res
      .status(result.status)
      .set("Access-Control-Allow-Origin", "*")
      .json(result.body);
  } catch (err) {
    console.error("[/today] error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// 특정 경주일 정보 (예: /race/20250104)
app.get("/race/:date", async (req, res) => {
  const { date } = req.params;
  const url = `https://m.kra.co.kr/py/api/race/${date}`;

  try {
    const result = await fetchWithPuppeteer(url);
    res
      .status(result.status)
      .set("Access-Control-Allow-Origin", "*")
      .json(result.body);
  } catch (err) {
    console.error("[/race/:date] error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// 디버그/범용용: 임의 URL 프록시
// 예: /raw?url=https://data.kra.co.kr/dbdata/TodayRaceInfo.json
app.get("/raw", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: "url query parameter required" });
  }

  try {
    const result = await fetchWithPuppeteer(targetUrl);

    res
      .status(result.status)
      .set("Access-Control-Allow-Origin", "*");

    if (result.isJson) {
      res.json(result.body);
    } else {
      res.type(result.contentType || "text/plain").send(result.body);
    }
  } catch (err) {
    console.error("[/raw] error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// 서버 시작
app.listen(PORT, () => {
  console.log(`KRA Puppeteer proxy listening on port ${PORT}`);
});
