# Ebookstore UI – Test Report

Run: 2026-11-03 · Chrome headless · Vite dev server `:3000` → Spring Boot `:8080` → PostgreSQL (seeded: 3 categories, 7 books, admin user).

| Layer | Tool | Tests | Passed | Failed |
|---|---|---|---|---|
| Unit / component | Vitest + React Testing Library (jsdom) | 138 | 138 | 0 |
| End-to-end (real browser, live backend) | Playwright-core + Chrome | 37 | 33 | 4 |

Run them:
```
cd ebookstore-ui
npm test                      # 138 unit/component tests (no backend needed)
npm run dev                   # in another terminal, with the backend running
node e2e/run-e2e.mjs          # 37 E2E tests -> e2e/e2e-report.md + e2e/screenshots/
```

## Unit / component tests (`src/**/*.test.jsx`)

| File | Covers |
|---|---|
| `components/Common.test.jsx` | StarRating (full/half/empty), Alert, Spinner, Pagination (disabled ends, active page, 0-based callbacks) |
| `components/ProductCard.test.jsx` | Fields, price format, image/placeholder, link, out-of-stock, anonymous→/login, add-to-cart success/error toasts |
| `components/Navbar.test.jsx` | Anonymous vs logged-in links, cart badge, URL-encoded search, blank search, sign-out, hamburger |
| `api/axiosClient.test.js` | Base URL, Bearer header, 401 clears session + redirects, non-401 / network errors keep session |
| `api/services.test.js` | URL / params / body contract of all 24 API calls |
| `context/AuthContext.test.jsx` | Restore/corrupt storage, signIn/signUp/signOut, failure leaves state untouched |
| `pages/AuthPages.test.jsx` | Login & Register: required fields, success redirect, server errors, pending state |
| `pages/CartPage.test.jsx` | Empty state, totals, ±qty, remove, errors, checkout nav, recommendations (+ failure tolerance) |
| `pages/CheckoutPage.test.jsx` | Address list/default, add address, validation, gift points maths (floor at 0), state passed to payment |
| `pages/PaymentPage.test.jsx` | 5 methods/forms, card auto-format, order→payment flow, UPI, error paths |
| `pages/CataloguePage.test.jsx` | Default/search/category loading, clear, empty states, pagination |
| `pages/ProductDetailPage.test.jsx` | Details, related, stock, qty clamp, add/buy-now, anonymous, not-found redirect |
| `pages/OrdersPage.test.jsx` | List, preview, expand, cancel rules + confirm, buy-again, pagination |
| `pages/ConfirmationHome.test.jsx` | Confirmation details/redirect, Home hero/categories/fallbacks |
| `App.test.jsx` | Protected routes redirect, public routes, wildcard → home |

Two tests use `it.fails` to document known defects (they stay green while the bug exists and turn red once it is fixed – then change them to plain `it`).

## End-to-end results (`e2e/e2e-report.md`)

33 pass: catalogue/category filter/search, product detail, route protection, register / login / reload / logout, duplicate email,
cart add / quantity / badge, checkout address, gift-point discount, UPI payment, confirmation, order history, Buy Again, cancel order, no JS errors.

## Defects found (4 failing E2E tests)

| ID | Sev | Where | What happens | Cause / suggested fix |
|---|---|---|---|---|
| **UI-04** (E2E-13) | **High** | Login page | A wrong password shows **no error message**; the page just reloads blank. | Backend answers `401`; `axiosClient` treats every 401 as an expired session and does `window.location.href='/login'` (full reload), wiping `LoginPage`'s error state. Fix: skip the redirect for `/auth/*` requests (or when no token was sent). Unit tests miss this because they mock `services`. |
| **UI-03** (E2E-37) | Medium | Invalid / expired JWT | User keeps a broken session: pages load empty and the console shows `403` errors. | Backend returns **403** (not 401) for a bad token, so the 401 interceptor never fires. Fix: backend `authenticationEntryPoint` returning 401, and/or also log out on 403 in the interceptor. |
| **CART-07 / UI** (E2E-23) | High | Cart page | Clicking ✕ (or − to 0) shows success but the item is still in the cart after reload. | Backend defect already reported in `ebookstore/api-tests/test-findings.md` (item re-saved via cascade). |
| **UI-02** (E2E-34, unit `[UI-02]`) | Low | `/payment` opened directly | Blank page instead of redirect to `/checkout`. | `PaymentPage` calls `navigate()` during render; React Router ignores it. Fix: `return <Navigate to="/checkout" replace />`. |
| **UI-01** (unit `[UI-01]`) | Medium | Catalogue pagination | Clicking a page number / › never changes page. | `setParam()` does `delete p.page` *after* setting it, so `page` is never written. Fix: only delete `page` when `key !== 'page'`. Not visible in E2E: seed data has 1 page (7 books). |

## Notes / not covered
- E2E-35 (pagination) is skipped at E2E level (needs > 20 books); covered by the unit test.
- Gift points are never shown to the user: `OrdersPage` reads `user.giftPoints`, but the login/register response has no such field, so it always displays 0.
- Admin screens do not exist in the UI (admin is API-only), so there is nothing to test there.
- No visual/responsive or accessibility testing was done beyond the screenshots in `e2e/screenshots/`.
- Each E2E run leaves one new customer (`e2eNNNNNNNNN@example.com`), one cancelled order and an address in the DB.

