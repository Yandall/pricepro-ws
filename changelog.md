# Changelog

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
