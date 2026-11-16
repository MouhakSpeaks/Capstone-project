# ebookstore-automation

Playwright **UI automation** for the BookHaven e-bookstore (`ebookstore-ui` + `ebookstore` + PostgreSQL).
Tests drive a real Chrome browser through the web UI. A thin REST client is used only to
create/clean test data quickly (new customers, books, orders), never to replace the UI step under test.

## Prerequisites

| Needed | How |
|---|---|
| Node.js 18+ | `node -v` |
| PostgreSQL + backend running | `cd ebookstore` then `mvn spring-boot:run` (port 8080, seeds admin + 7 books on first start) |
| Web UI running | `cd ebookstore-ui` then `npm run dev` (port 3000) |
| Google Chrome installed | or set `BROWSER_CHANNEL=msedge`, or `BROWSER_CHANNEL=` (empty) after `npx playwright install chromium` |

A pre-flight check (`global-setup.js`) stops the run with a clear message if the UI, the API or the seed data is missing.

## Install and run

```powershell
cd ebookstore-automation
npm install

npm test                  # all tests, headless
npm run test:smoke        # 14 core tests (tagged @smoke)
npm run test:headed       # watch the browser   (or:  $env:HEADED=1; npm test)
npm run test:ui           # Playwright UI mode (time-travel debugging)
npm run report            # open the HTML report from the last run
```

Run a single file or test:

```powershell
npx playwright test tests/05-purchase.spec.js
npx playwright test -g "pay with a credit card"
```

### Settings (environment variables)

| Variable | Default | Purpose |
|---|---|---|
| `UI_URL` | `http://localhost:3000` | Where the React app is served |
| `API_URL` | `http://localhost:8080/api` | Used for test data set-up only |
| `BROWSER_CHANNEL` | `chrome` | `chrome`, `msedge`, or empty for bundled Chromium |
| `HEADED` | unset | Set to any value to show the browser |
| `VIDEO` | unset | Record video of failures (needs `npx playwright install ffmpeg`) |
| `CI` | unset | 2 workers and 1 retry |
| `RAW_DEFECTS` | unset | Set to `1` to run the known-defect tests as normal tests, so they show as **failed** (see below) |

## Results and reports

After each run:

* `reports/html/index.html`: interactive report (steps, screenshots, traces)
* `reports/results.json`: machine-readable results
* `reports/artifacts/`: screenshot + trace for each failed test (`npx playwright show-trace <trace.zip>`)

## Structure

```
ebookstore-automation/
  playwright.config.js     browser, timeouts, reporters
  global-setup.js          pre-flight check (UI up? API up? data seeded?)
  support/api.js           REST helper for test data (register, create book, buy, cancel ...)
  fixtures/index.js        custom fixtures: pages, customer, signedIn, book, adminToken
  pages/                   page objects (selectors live here, not in the specs)
  tests/
    01-public.spec.js      home, catalogue, filter, search, product detail, route protection
    02-auth.spec.js        register, login, logout, session, validation
    03-cart.spec.js        add / change / persist cart, per-customer carts
    04-checkout.spec.js    addresses, gift points, payment methods and forms
    05-purchase.spec.js    full journeys: UPI, cards, net banking, points, stock
    06-orders.spec.js      history, details, cancel, buy again
    07-misc.spec.js        pagination, JS errors, mobile layout
```

### Fixtures

| Fixture | What you get |
|---|---|
| `pages` | `pages.cart`, `pages.checkout`, `pages.payment`, `pages.orders`, ... |
| `customer` | A brand-new customer (unique e-mail) registered through the API, with `token` |
| `signedIn` | The `page`, already signed in as `customer` (skips the login screen for speed) |
| `book` | A fresh $19.99 book with stock 50, created by the admin and deactivated after the test |
| `adminToken` | Bearer token of `admin@bookstore.com` for custom set-up |

Tests are independent: each one creates its own customer and books, so they run in parallel (3 workers) in any order.

## Known defects: tests marked "expected to fail"

Tests in the *Known defects / gaps* groups use `test.fail()`. They are **reported as passed while the
bug exists** and flip to **failed (“expected to fail but passed”) as soon as the bug is fixed**, which
is your signal to remove the `test.fail()` line.
To see them as plain failures (for a defect report), run `$env:RAW_DEFECTS=1; npm test`: 10 tests fail, each pointing at one of the defects below.

| Test | Defect |
|---|---|
| wrong password shows an error | UI-04 |
| invalid token signs the user out | UI-03 |
| removing a cart line deletes it | CART-07 |
| `/payment` opened directly redirects | UI-02 |
| pagination Next goes to page 2 | UI-01 |
| (UI-01 test needs 22 books; it creates and removes them itself) | |
| cart/order cannot exceed stock | G-1 / FR-D8 |
| cancel returns stock | G-2 / FR-F7 |
| gift point balance on My Orders | G-5 / FR-H3 |
| cancelling twice is rejected | NEW-01 |

## Data created by the tests

Each run adds customers (`pw…@example.com`), addresses and orders to the database; test books are
soft-deleted afterwards. Use a disposable database for repeated runs.
The UI-01 test adds books up to 22 so a second catalogue page exists, then removes them.
