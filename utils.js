/**
 *
 * @param {import("./index").ReqBody} reqBody
 * @throws
 */
exports.assertReqBody = (reqBody) => {
  if (typeof reqBody === "undefined") throw new Error("Body undefined");
  if (typeof reqBody.url !== "string") throw new Error("url undefined");
  if (!["json", "html"].includes(reqBody.returnType))
    throw new Error(`"json" and "html" only allowed for returnType`);

  if (reqBody.returnType === "html") {
    if (
      typeof reqBody.selectBody !== "string" ||
      typeof reqBody.waitForSelector !== "string"
    )
      throw new Error(
        `"selectBody" and "waitForSelector" are required for "html" returnType`
      );
  } else if (reqBody.returnType === "json") {
    if (typeof reqBody.matchRules !== "object")
      throw new Error("invalid matchRules");
    if (
      typeof reqBody.matchRules.url === "undefined" &&
      typeof reqBody.matchRules.requestPostData === "undefined" &&
      typeof reqBody.matchRules.responseData === "undefined"
    )
      throw new Error(
        `"matchRules.requestPostData" and "matchRules.url" should be arrays `
      );
    if (
      typeof reqBody.selectReturnObject !== "undefined" &&
      !Array.isArray(reqBody.selectReturnObject)
    )
      throw new Error(`"selectReturnObject" should be an array`);

    let validRuleFunctions = true;
    if (reqBody.matchRules.url)
      validRuleFunctions =
        validRuleFunctions &&
        reqBody.matchRules.url.every((v) =>
          ["includes", "endsWith", "startsWith"].includes(Object.keys(v)[0])
        );
    if (reqBody.matchRules.requestPostData)
      validRuleFunctions =
        validRuleFunctions &&
        reqBody.matchRules.requestPostData.every((v) =>
          ["includes", "endsWith", "startsWith"].includes(Object.keys(v)[0])
        );
    if (reqBody.matchRules.responseData)
      validRuleFunctions =
        validRuleFunctions &&
        reqBody.matchRules.responseData.every((v) =>
          ["includes", "endsWith", "startsWith"].includes(Object.keys(v)[0])
        );
    if (!validRuleFunctions) throw new Error("invalid match rule functions");
  }
};
