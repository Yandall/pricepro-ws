const chromium = require("chrome-aws-lambda");
const { assertReqBody } = require("./utils");

/**
 * @typedef ReqBody
 * @type {object}
 * @property {string} url
 * @property {string} waitForSelector
 * @property {string} selectBody
 * @property {MatchRules} [matchRules]
 * @property {number} [maxWait]
 * @property {number} [sleepTime]
 * @property {"json" | "html"} returnType
 */

/**
 *
 * @typedef MatchRules
 * @type {object}
 * @property {Array<Object.<string,string>>} [url]
 * @property {Array<Object.<string,string>>} [requestPostData]
 */

/**
 * @typedef EventType
 * @type {import("aws-lambda").APIGatewayProxyEvent}
 */

/**
 * @typedef ReturnType
 * @type {import("aws-lambda").APIGatewayProxyResult}
 */

/**
 * @type {import("aws-lambda").Handler<EventType, ReturnType>}=
 */
exports.handler = async (event, _) => {
  /**
   * @type {ReqBody}
   */
  let payload = JSON.parse(event.body);
  let bodyReponse;
  let browser;
  try {
    assertReqBody(payload);
    browser = await chromium.puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();

    await page.setRequestInterception(true);

    // Allow script, xhr and fetch request and block everything else
    page.on("request", (req) => {
      if (
        !["document", "xhr", "fetch", "script"].includes(req.resourceType())
      ) {
        return req.abort();
      }
      req.continue();
    });

    await page.goto(payload.url);
    if (payload.returnType === "json") {
      await page.waitForResponse(
        async (response) => {
          if (!["fetch", "xhr"].includes(response.request().resourceType()))
            return false;
          let matchRules = payload.matchRules;
          let waited = true;
          if (matchRules.url) {
            for (const rule of matchRules.url) {
              const func = Object.keys(rule)[0];
              try {
                waited = waited && response.url()[func](rule[func]);
              } catch {
                return false;
              }
            }
          }
          if (matchRules.requestPostData) {
            for (const rule of matchRules.requestPostData) {
              const func = Object.keys(rule)[0];
              try {
                waited =
                  waited && response.request().postData()[func](rule[func]);
              } catch {
                waited = false;
              }
            }
          }
          if (!waited) return false;
          bodyReponse = await response.text();
          return true;
        },
        { timeout: payload.maxWait }
      );
    } else if (payload.returnType === "html") {
      await page.waitForSelector(payload.waitForSelector, {
        timeout: payload.maxWait,
      });

      if (payload.sleepTime) await page.waitForTimeout(payload.sleepTime);

      if (payload.selectBody) {
        bodyReponse = await page.$eval(
          payload.selectBody,
          (element) => element.innerHTML
        );
      } else {
        bodyReponse = await page.evaluate(() => document.body.innerHTML);
      }
    }
  } catch (error) {
    console.error(error);
    return {
      body: JSON.stringify({
        error: error.message,
      }),
      headers: { "Content-Type": "application/json" },
      statusCode: 500,
    };
  } finally {
    if (browser !== undefined) {
      await browser.close();
    }
  }
  let contentType =
    payload.returnType === "json"
      ? "application/json"
      : "text/html; charset=utf-8";
  return {
    body: bodyReponse,
    statusCode: 200,
    headers: { "Content-Type": contentType },
  };
};
