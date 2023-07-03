const chromium = require("chrome-aws-lambda");
const { assertReqBody } = require("./utils");

/**
 * @typedef ReqBody
 * @type {object}
 * @property {string} url
 * @property {string} waitForSelector
 * @property {string} selectBody
 * @property {MatchRules} [matchRules]
 * @property {string[]} [selectReturnObject]
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
 * @property {Array<Object.<string,string>>} [responseData]
 *
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
exports.handler = async (event, context, callback) => {
  const timer = setTimeout(() => {
    context.callbackWaitsForEmptyEventLoop = false;
    callback(null, {
      statusCode: 408,
      body: `{ "error": "Timeout due to maxWait being reached" }`,
      headers: { "Content-Type": "application/json" },
    });
  }, context.getRemainingTimeInMillis() - 1 * 1000);
  /**
   * @type {ReqBody}
   */
  let payload = JSON.parse(event.body);
  let bodyResponse;
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
    page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    );

    await page.setRequestInterception(true);

    // Allow script, xhr and fetch request and block everything else
    page.on("request", async (req) => {
      if (
        !["document", "xhr", "fetch", "script"].includes(req.resourceType())
      ) {
        return req.abort();
      }
      req.continue();
    });

    if (payload.returnType === "json") {
      //Start request interceptor before navigating to url
      page.on("response", async (response) => {
        if (!["fetch", "xhr"].includes(response.request().resourceType()))
          return;
        let matchRules = payload.matchRules;
        let waited = true;
        if (matchRules.url) {
          for (const rule of matchRules.url) {
            const func = Object.keys(rule)[0];
            try {
              waited = waited && response.url()[func](rule[func]);
            } catch {
              return;
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
        if (matchRules.responseData) {
          for (const rule of matchRules.responseData) {
            const func = Object.keys(rule)[0];
            try {
              const text = await response.text();
              waited = waited && text[func](rule[func]);
            } catch {
              waited = false;
            }
          }
        }
        if (!waited) return;
        if (
          Array.isArray(payload.selectReturnObject) &&
          payload.selectReturnObject.length > 0
        ) {
          try {
            bodyResponse = await response.json();
            let returnedObject = bodyResponse;
            for (const index of payload.selectReturnObject) {
              returnedObject = returnedObject[index];
            }
            bodyResponse = JSON.stringify(returnedObject);
          } catch (error) {
            console.error(error);
            bodyResponse = await response.text();
          }
        } else bodyResponse = await response.text();
      });
    }
    await page.goto(payload.url);
    if (payload.returnType === "json") {
      // Wait until bodyResponse has a value
      while (!bodyResponse) {
        await new Promise((resolve, _) => {
          setTimeout(() => {
            resolve();
          }, 100);
        });
      }
    } else if (payload.returnType === "html") {
      await page.waitForSelector(payload.waitForSelector, {
        timeout: payload.maxWait,
      });

      if (payload.sleepTime) await page.waitForTimeout(payload.sleepTime);

      if (payload.selectBody) {
        bodyResponse = await page.$eval(
          payload.selectBody,
          (element) => element.innerHTML
        );
      } else {
        bodyResponse = await page.evaluate(() => document.body.innerHTML);
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
    clearTimeout(timer);
  }
  let contentType =
    payload.returnType === "json"
      ? "application/json"
      : "text/html; charset=utf-8";
  return {
    body: bodyResponse,
    statusCode: 200,
    headers: { "Content-Type": contentType },
  };
};
