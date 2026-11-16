# Ebookstore – Test Findings

Run: 2026-11-03, backend on `localhost:8080`, PostgreSQL `ebookstore_db`.
Result: **52 tests, 49 passed, 3 failed** (full table: `test-report.md`).

## Test data
The database was already seeded by `DataSeeder` (admin user, 3 categories, 7 books), so nothing was inserted manually.
The tests register throw-away customers (`testerYYYYMMDDHHMMSS@example.com`) and create/delete their own category and product.

## Defects found

| # | Test | Severity | Observed | Likely cause |
|---|------|----------|----------|--------------|
| 1 | CART-07 | High | `DELETE /api/cart/items/{id}` and `PUT /api/cart/items/{id}?quantity=0` return 200 but the item is still in the cart (also on re-fetch). Only `DELETE /api/cart` works. | `CartService.removeFromCart/updateCartItem` call `cartItemRepository.delete(item)`, then `cartRepository.save(cart)`. The item is still in `cart.getItems()` (`cascade = ALL`), so the save re-persists it. Fix: `cart.getItems().remove(item)` (orphanRemoval) instead of deleting via the repository. |
| 2 | PAY-04 | Low | `POST /api/users/payment` with `paymentMethod: "BITCOIN"` (and any malformed JSON body, e.g. login) returns **500** instead of 400. | `GlobalExceptionHandler` has no handler for `HttpMessageNotReadableException`; it falls through to the generic `Exception` handler. |
| 3 | ADDR-05 | Medium | Deleting an address that was used for an order returns **500** with a raw SQL FK-violation message. | `orders.shipping_address_id` references `addresses`; `AddressService.deleteAddress` does a hard delete. Should return a 400/409 with a friendly message, or soft-delete the address. |

## Observations (not failures)
- Unauthenticated / invalid-token requests to protected endpoints return **403** (not 401).
- Unknown product/order ids return **400** (not 404) because services throw `IllegalArgumentException`.
- `POST /api/users/payment` does not check that the order belongs to the caller (`PaymentService` takes only the order id).
- `placeOrder` awards points on the discounted total; pointsToRedeem is capped at the user's balance (verified in ORD-06).
- `EbookstoreApplicationTests` uses `ddl-auto=create-drop` against the real `ebookstore_db`; it was **not run** because it would drop the tables of the live database.

## Leftover test data
Each run leaves a few extra customers, orders, a soft-deleted product and a renamed `TestCat…` category in the DB.

## Re-run
```
powershell -ExecutionPolicy Bypass -File ebookstore\api-tests\run-api-tests.ps1
```
