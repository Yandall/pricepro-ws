# Changelog

## v0.2.2

- Changed how requests are being intercepted. Now `page.on("response")` is used
- Added timer to send error when function is about to timeout
- Allow matching request by response value using `matchRules.responseData`

## v0.2.1

- Allow indexing the result value if `returnType` equals "json" using array `selectReturnObject`

## v0.2.0

- Intercept browser requests and return its response:
  - Match desired request by using `includes, startsWith, endsWith` on request url or reponse value
- Validates lambda request
- Allow script, xhr and fetch requests and block everything else in browser for better performance

## v0.1.0

- Allow webscraping pages by the following properties:
  - url
  - waitForSelector
  - selectBody: returns the element that matches the css selector
  - maxWait
  - sleepTime: milliseconds to renders after `waitForSelector`
