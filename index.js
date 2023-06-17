const chromium = require("chrome-aws-lambda");

/**
 * @typedef EventType
 * @type {import("aws-lambda").APIGatewayProxyEvent}
 */

/**
 * @typedef ReturnType
 * @type {import("aws-lambda").APIGatewayProxyResult}
 */

/**
 * @typedef ReqBody
 * @type {object}
 * @property {string} url
 * @property {string} waitForSelector
 * @property {string} selectBody
 * @property {number} [maxWait]
 * @property {number} [sleepTime]
 */

/**
 * @type {import("aws-lambda").Handler<EventType, ReturnType>}=
 */
exports.handler = async (event, context) => {
  let browser = null;
  /**
   * @type {ReqBody}
   */
  let payload = JSON.parse(event.body);
  let htmlBody = "";

  if (!payload.url || !payload.waitForSelector || !payload.selectBody) {
    return {
      body: JSON.stringify({
        error: `"url", "waitForSelector" and "selectBody" should not be emtpy`,
      }),
      statusCode: 400,
    };
  }

  try {
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.goto(payload.url);
    await page.waitForSelector(payload.waitForSelector, {
      timeout: payload.maxWait,
    });

    if (payload.sleepTime) await page.waitForTimeout(payload.sleepTime);

    if (payload.selectBody) {
      htmlBody = await page.$eval(
        payload.selectBody,
        (element) => element.innerHTML
      );
    } else {
      htmlBody = await page.evaluate(() => document.body.innerHTML);
    }
  } catch (error) {
    console.error(error);
    return {
      body: JSON.stringify({
        error: JSON.stringify(error),
      }),
      statusCode: 500,
    };
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
  return {
    body: htmlBody,
    statusCode: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  };
};
