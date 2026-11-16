const L = require('./lib.cjs')
const { run, P, H1, H2, bullets, note, gap, code, table, titlePage, build } = L
const OUT = process.argv[2]

// ---------- test case data ----------
// tc(id, ref, title, steps, expected, type, priority, result, evidence)
const tc = (id, ref, title, steps, expected, type, pri, result, evidence) =>
  ({ id, ref, title, steps, expected, type, pri, result, evidence })

const MODS = [
  ['6.1 Account and Access', [
    tc('TC-AUTH-01', 'FR-A1', 'Register a new customer', 'POST /auth/register with valid names, unique email, password', '201, token returned, role CUSTOMER, empty cart created', 'API', 'High', 'Pass', 'AUTH-01, E2E-14'),
    tc('TC-AUTH-02', 'FR-A2', 'Register with an email already in use', 'Register the same email twice', '400 "Email already in use"; UI shows duplicate error', 'API/E2E', 'High', 'Pass', 'AUTH-02, E2E-18'),
    tc('TC-AUTH-03', 'FR-A2', 'Register with invalid email or blank fields', 'POST /auth/register with bad email, blank names', '400 "Validation failed" with field messages', 'API', 'Med', 'Pass', 'AUTH-03'),
    tc('TC-AUTH-04', 'FR-A3', 'Login with valid credentials', 'POST /auth/login with registered email and password', '200, token (24 h), role CUSTOMER', 'API/E2E', 'High', 'Pass', 'AUTH-04, E2E-17'),
    tc('TC-AUTH-05', 'FR-A3', 'Login with wrong password', 'POST /auth/login with wrong password', '401 "Invalid email or password"', 'API', 'High', 'Pass', 'AUTH-05'),
    tc('TC-AUTH-06', 'FR-A3', 'Login with malformed email', 'POST /auth/login with email "abc"', '400 validation error', 'API', 'Low', 'Pass', 'AUTH-06'),
    tc('TC-AUTH-07', 'FR-A8', 'Seeded administrator can log in', 'Login admin@bookstore.com / admin123', '200, role ADMIN', 'API', 'High', 'Pass', 'AUTH-07'),
    tc('TC-AUTH-08', 'FR-A4', 'Wrong password shows an error message in the UI', 'Open /login, enter wrong password, click Sign In', 'Visible error message; user stays on login page', 'E2E', 'High', 'Fail', 'E2E-13 (UI-04)'),
    tc('TC-AUTH-09', 'FR-A5', 'Session survives page reload', 'Log in, reload the browser', 'User still signed in (token in localStorage)', 'E2E', 'High', 'Pass', 'E2E-15'),
    tc('TC-AUTH-10', 'FR-A5', 'Sign out clears the session', 'Click Sign Out', 'Token and user removed; navbar shows Sign In', 'E2E', 'High', 'Pass', 'E2E-16'),
    tc('TC-AUTH-11', 'FR-A6', 'Protected pages redirect anonymous visitors', 'Open /cart, /checkout, /orders while logged out', 'Redirected to /login', 'E2E', 'High', 'Pass', 'E2E-10, 11, 12'),
    tc('TC-AUTH-12', 'FR-A7', 'Invalid or expired token signs the user out', 'Log in, corrupt token in localStorage, open /orders', 'Redirect to /login with cleared session', 'E2E', 'Med', 'Fail', 'E2E-37 (UI-03)'),
    tc('TC-AUTH-13', 'FR-A1, NFR-5', 'Weak password is rejected', 'Register with password "1"', '400 (minimum length rule)', 'API', 'Med', 'Fail', 'SUP-04 (NEW-05)'),
    tc('TC-AUTH-14', 'NFR-5', 'Login response never exposes the password hash', 'Inspect login response fields', 'Only token, email, firstName, lastName, role', 'API', 'High', 'Pass', 'Probe'),
    tc('TC-AUTH-15', 'FR-A1, A3', 'Login and register forms behave correctly', 'Component tests: field entry, submit, loading state, toast', 'Forms submit, button disabled while signing in', 'Unit', 'Med', 'Pass', 'AuthPages.test'),
    tc('TC-AUTH-16', 'NFR-5', 'Tampered token is denied', 'Call GET /orders with token + "x"', '401 or 403', 'API', 'High', 'Pass', 'SUP-08, SEC-02'),
    tc('TC-AUTH-17', 'NFR-5', 'Anonymous call to a protected API is denied', 'GET /cart with no token', 'Denied (403 today; 401 is the target, see TC-PLAT-03)', 'API', 'High', 'Pass', 'SEC-01'),
  ]],
  ['6.2 Catalogue and Search', [
    tc('TC-CAT-01', 'FR-B1', 'Home page content', 'Open /', 'Hero, category tiles, top-rated books loaded from DB', 'E2E', 'Med', 'Pass', 'E2E-01'),
    tc('TC-CAT-02', 'FR-B2', 'List all active books', 'GET /products; open /catalogue', '200, paged list; 7 books shown', 'API/E2E', 'High', 'Pass', 'PRD-01, E2E-03'),
    tc('TC-CAT-03', 'FR-B2', 'Page size is honoured', 'GET /products?size=3', '3 items, correct totalPages', 'API', 'Med', 'Pass', 'SUP-05'),
    tc('TC-CAT-04', 'FR-B2', 'Pagination: Next moves to page 2', 'On /catalogue with more than 20 books click Next', 'Page 2 is shown', 'Unit', 'Med', 'Fail', 'Unit it.fails (UI-01)'),
    tc('TC-CAT-05', 'FR-B3', 'Filter by category', 'GET /products/category/{id}; click a category in UI', 'Only books of that category', 'API/E2E', 'High', 'Pass', 'PRD-07, E2E-04'),
    tc('TC-CAT-06', 'FR-B4', 'Search by title and by author', 'GET /products/search?keyword=...', 'Matching books returned', 'API/E2E', 'High', 'Pass', 'PRD-04, PRD-05, E2E-05'),
    tc('TC-CAT-07', 'FR-B4', 'Search is case-insensitive', 'Search "COSMOS"', 'Finds "Cosmos"', 'API', 'Med', 'Pass', 'SUP-06'),
    tc('TC-CAT-08', 'FR-B4', 'Search with no match', 'Search a nonsense word', 'Empty page; UI empty state', 'API/E2E', 'Med', 'Pass', 'PRD-06, E2E-06'),
    tc('TC-CAT-09', 'FR-B4', 'Search without a keyword', 'GET /products/search (no parameter)', '400 with a clear message', 'API', 'Low', 'Fail', 'SUP-07 (NEW-04)'),
    tc('TC-CAT-10', 'NFR-5', 'SQL-injection text in search', 'Search for \' OR \'1\'=\'1', 'No error, 0 hits (parameterised query)', 'API', 'High', 'Pass', 'Probe'),
    tc('TC-CAT-11', 'FR-B5', 'Book detail', 'GET /products/{id}; open /products/{id}', 'All detail fields shown: price, stock, ISBN, delivery date', 'API/E2E', 'High', 'Pass', 'PRD-02, E2E-07'),
    tc('TC-CAT-12', 'FR-B5', 'Unknown book id', 'GET /products/999999', 'Rejected with a clear message (400 today; 404 target)', 'API', 'Med', 'Pass', 'PRD-03'),
    tc('TC-CAT-13', 'FR-B6', 'Related books', 'GET /products/{id}/related', 'Up to 6, same category, excluding itself', 'API/E2E', 'Med', 'Pass', 'PRD-08, E2E-07'),
    tc('TC-CAT-14', 'FR-B7', 'Out-of-stock book is marked and cannot be added', 'Show a book with stock 0 (card and detail page)', '"Out of Stock" badge, Sold Out button disabled', 'Unit', 'High', 'Pass', 'ProductCard.test, ProductDetailPage.test'),
    tc('TC-CAT-15', 'FR-B8', 'Unknown book in UI', 'Open /products/999999', 'Redirect to /catalogue', 'E2E', 'Low', 'Pass', 'E2E-08'),
    tc('TC-CAT-16', 'FR-B1', 'Category list', 'GET /categories and /categories/{id}', '200 with seeded categories', 'API', 'Med', 'Pass', 'CAT-01, CAT-02'),
    tc('TC-CAT-17', 'NFR-1', 'Catalogue response time', '20 calls to GET /products?size=20', 'Typical response under 1 second', 'API', 'Med', 'Pass', 'Probe: avg 18 ms, p95 21 ms'),
  ]],
  ['6.3 Catalogue Management (Administrator)', [
    tc('TC-ADM-01', 'FR-C1', 'Admin creates a book', 'POST /products as admin with valid body', '201, ProductDTO', 'API', 'High', 'Pass', 'ADM-03'),
    tc('TC-ADM-02', 'FR-C1', 'Admin updates a book price', 'PUT /products/{id}', '200, new price', 'API', 'High', 'Pass', 'ADM-04'),
    tc('TC-ADM-03', 'FR-C1', 'Admin removes a book (soft delete)', 'DELETE /products/{id}; search for it', '200; no longer in catalogue (active=false)', 'API', 'High', 'Pass', 'ADM-06'),
    tc('TC-ADM-04', 'FR-C1', 'Book with missing title or price', 'POST /products without title/price', '400 validation', 'API', 'Med', 'Pass', 'ADM-05'),
    tc('TC-ADM-05', 'FR-C1, BR', 'Boundary: price 0 and negative price', 'POST /products with price 0, then -5', '400 for both', 'API', 'High', 'Pass', 'SUP-01, SUP-02'),
    tc('TC-ADM-06', 'FR-C1', 'Duplicate ISBN', 'Create two books with the same ISBN', '400 with a clear message (not 500)', 'API', 'Low', 'Fail', 'SUP-03 (NEW-03)'),
    tc('TC-ADM-07', 'FR-C2', 'Admin manages categories', 'Create, update, delete a category', '201 / 200 / 200', 'API', 'High', 'Pass', 'ADM-01, ADM-02, ADM-07'),
    tc('TC-ADM-08', 'FR-C3', 'Customer cannot create a book or category', 'POST /products and /categories with customer token', '403', 'API', 'High', 'Pass', 'SEC-03, SEC-04'),
    tc('TC-ADM-09', 'FR-C3', 'Customer cannot delete a book', 'DELETE /products/{id} with customer token', '403', 'API', 'High', 'Pass', 'SUP-12'),
    tc('TC-ADM-10', 'FR-C4', 'Administrator web screens', 'Look for admin pages in the web app', 'Screens to manage books, categories and orders', 'Manual', 'Med', 'Not implemented', 'Gap G-8'),
  ]],
  ['6.4 Shopping Cart', [
    tc('TC-CART-01', 'FR-D7', 'New customer cart is empty', 'GET /cart for a new user; open /cart', 'Zero items; empty state with Continue Shopping', 'API/E2E', 'Med', 'Pass', 'CART-01, E2E-19'),
    tc('TC-CART-02', 'FR-D1', 'Add a book to the cart', 'POST /cart/items quantity 1', '200, one line; navbar badge updates', 'API/E2E', 'High', 'Pass', 'CART-02, E2E-20'),
    tc('TC-CART-03', 'FR-D1', 'Adding the same book merges quantity', 'Add the same book twice', 'One line, quantity 2', 'API', 'High', 'Pass', 'CART-03'),
    tc('TC-CART-04', 'FR-D1', 'Boundary: quantity below 1', 'POST /cart/items quantity 0', '400 validation', 'API', 'Med', 'Pass', 'CART-05'),
    tc('TC-CART-05', 'FR-D1', 'Add an unknown book', 'POST /cart/items productId 999999', '400 "Product not found"', 'API', 'Med', 'Pass', 'CART-06'),
    tc('TC-CART-06', 'FR-D2', 'Cart shows unit price, quantity, subtotal and total', 'Add two books; open /cart', 'Correct line subtotals and cart total', 'E2E/Unit', 'High', 'Pass', 'E2E-21, CartPage.test'),
    tc('TC-CART-07', 'FR-D3', 'Change a line quantity', 'PUT /cart/items/{id}?quantity=3; click + in UI', 'Quantity and totals update', 'API/E2E', 'High', 'Pass', 'CART-04, E2E-22'),
    tc('TC-CART-08', 'FR-D4', 'Remove a line from the cart', 'DELETE /cart/items/{id}; click the remove icon, reload', 'Line is gone after reload', 'API/E2E', 'High', 'Fail', 'CART-07, E2E-23'),
    tc('TC-CART-09', 'FR-D4', 'Set a line quantity to 0', 'PUT /cart/items/{id}?quantity=0', 'Line removed (same root cause as TC-CART-08)', 'API', 'Med', 'Not run', 'Retest after CART-07 fix'),
    tc('TC-CART-10', 'FR-D5', 'Navbar badge shows the line count', 'Add items, watch navbar', 'Badge equals number of lines', 'E2E', 'Low', 'Pass', 'E2E-20, Navbar.test'),
    tc('TC-CART-11', 'FR-D6', 'Suggestions from the latest order', 'Open /cart after an order exists', 'Recommended books shown; cart still renders if lookup fails', 'Unit', 'Low', 'Pass', 'CartPage.test'),
    tc('TC-CART-12', 'FR-D8', 'Quantity cannot exceed stock', 'Add 10 of a book with stock 3', '400 rejected', 'API', 'High', 'Fail', 'SUP-22 (G-1)'),
    tc('TC-CART-13', 'NFR-5', 'Carts are private per customer', 'Customer A adds a book; customer B views own cart', 'B sees 0 items', 'API', 'High', 'Pass', 'SUP-11'),
    tc('TC-CART-14', 'FR-A6', 'Anonymous "Add to cart"', 'Click + Cart while logged out', 'Redirect to /login', 'E2E', 'Med', 'Pass', 'E2E-09'),
  ]],
  ['6.5 Delivery Addresses and Checkout', [
    tc('TC-ADDR-01', 'FR-E1', 'Add an address', 'POST /users/addresses with required fields', '200, address returned', 'API', 'High', 'Pass', 'ADDR-01'),
    tc('TC-ADDR-02', 'FR-E1', 'List addresses', 'GET /users/addresses', 'Own addresses only', 'API', 'High', 'Pass', 'ADDR-02'),
    tc('TC-ADDR-03', 'FR-E1', 'Update an address', 'PUT /users/addresses/{id}', 'Updated values', 'API', 'Med', 'Pass', 'ADDR-03'),
    tc('TC-ADDR-04', 'FR-E1', 'Address validation', 'POST with blank street/city', '400', 'API', 'Med', 'Pass', 'ADDR-04'),
    tc('TC-ADDR-05', 'FR-E1', 'Delete an address not used by any order', 'DELETE /users/addresses/{id}', '200', 'API', 'Med', 'Pass', 'Probe'),
    tc('TC-ADDR-06', 'FR-E5', 'Delete an address used by an order', 'DELETE an address referenced by an order', '400 with a clear message', 'API', 'Med', 'Fail', 'ADDR-05'),
    tc('TC-ADDR-07', 'NFR-5', "Customer B cannot change or delete A's address", 'PUT and DELETE A\'s address with B\'s token', 'Rejected', 'API', 'High', 'Pass', 'SUP-09, SUP-10'),
    tc('TC-ADDR-08', 'FR-E2', 'Default (or first) address is preselected', 'Open /checkout with saved addresses', 'Default selected; first if none is default', 'Unit', 'Med', 'Pass', 'CheckoutPage.test'),
    tc('TC-ADDR-09', 'FR-E3', 'Continue is blocked without an address', 'Click Continue with none selected', 'Toast "Please select a delivery address"', 'Unit', 'High', 'Pass', 'CheckoutPage.test'),
    tc('TC-ADDR-10', 'FR-E1, E3', 'First-time user adds an address at checkout', 'Open /checkout with no address; fill and save', 'Form shown automatically; saved address selected', 'E2E', 'High', 'Pass', 'E2E-24, E2E-25'),
    tc('TC-ADDR-11', 'FR-E4', 'Gift points reflected in the summary', 'Enter 100 points at checkout', 'Total reduced by $1.00; never below zero', 'E2E/Unit', 'High', 'Pass', 'E2E-26, CheckoutPage.test'),
  ]],
  ['6.6 Orders', [
    tc('TC-ORD-01', 'FR-F1', 'Place an order', 'POST /orders with address id', '201, order number ORD-XXXXXXXX, total equals cart total', 'API', 'High', 'Pass', 'ORD-01'),
    tc('TC-ORD-02', 'FR-F2', 'Stock decreases and cart empties', 'Check stock and cart after TC-ORD-01', 'Stock reduced by quantity; cart has 0 items', 'API/E2E', 'High', 'Pass', 'ORD-01, E2E-29'),
    tc('TC-ORD-03', 'FR-F1', 'Order with an empty cart', 'POST /orders with no cart items', '400 "Cart is empty"', 'API', 'High', 'Pass', 'ORD-02'),
    tc('TC-ORD-04', 'FR-F1', 'Order with an unknown address', 'POST /orders shippingAddressId 999999', '400 "Address not found"', 'API', 'Med', 'Pass', 'SUP-19'),
    tc('TC-ORD-05', 'FR-F3', 'Order history', 'GET /orders; open /orders', 'Newest first, 10 per page, status badge', 'API/E2E', 'High', 'Pass', 'ORD-03, E2E-30'),
    tc('TC-ORD-06', 'FR-F3', 'Order detail', 'GET /orders/{id}; expand an order', 'Items, address, points, Buy Again and Cancel', 'API/E2E', 'High', 'Pass', 'ORD-04, E2E-31'),
    tc('TC-ORD-07', 'FR-F4', 'Another customer cannot read the order', 'GET /orders/{id} with a different token', 'Rejected ("Order not found")', 'API', 'High', 'Pass', 'ORD-05'),
    tc('TC-ORD-08', 'FR-F5', 'Cancel within 48 hours', 'PUT /orders/{id}/cancel on a new order', '200, status CANCELLED', 'API/E2E', 'High', 'Pass', 'ORD-07, E2E-33'),
    tc('TC-ORD-09', 'FR-F5', "Another customer cannot cancel the order", 'Cancel with a different token', 'Rejected', 'API', 'High', 'Pass', 'SUP-21'),
    tc('TC-ORD-10', 'FR-F5', 'Boundary: cancel after 48 hours', 'Set createdAt 49 h back in the DB, then cancel', '400, cancellation window expired', 'Manual', 'High', 'Not run', 'Needs DB timestamp change'),
    tc('TC-ORD-11', 'FR-F5', 'Cancel a SHIPPED or DELIVERED order', 'Set status in the DB, then cancel', '400, rejected', 'Manual', 'High', 'Not run', 'No way to set status (G-6)'),
    tc('TC-ORD-12', 'FR-F5', 'Cancel an order that is already cancelled', 'Cancel the same order twice', 'Second call rejected', 'API', 'High', 'Fail', 'SUP-20 (NEW-01)'),
    tc('TC-ORD-13', 'FR-F5', 'UI offers Cancel only for PENDING/CONFIRMED and asks to confirm', 'Expand orders of different status; click Cancel', 'Button only when allowed; confirm dialog; server refusal shown as toast', 'Unit', 'Med', 'Pass', 'OrdersPage.test'),
    tc('TC-ORD-14', 'FR-F6', 'Cancel returns redeemed points', 'Order with 20 points redeemed, then cancel', 'Balance + 20', 'API', 'High', 'Pass', 'SUP-31 (first credit correct)'),
    tc('TC-ORD-15', 'FR-F7', 'Cancel returns books to stock', 'Order 2 books, cancel, read stock', 'Stock back to original', 'API', 'Med', 'Fail', 'SUP-24 (G-2)'),
    tc('TC-ORD-16', 'FR-F8', 'Buy Again', 'Click Buy Again on a past order', 'Every line back in cart with its quantity', 'E2E/Unit', 'Med', 'Pass', 'E2E-32, OrdersPage.test'),
    tc('TC-ORD-17', 'FR-F9', 'Confirmation page', 'Complete payment', 'Order number, item and total shown', 'E2E', 'High', 'Pass', 'E2E-28'),
    tc('TC-ORD-18', 'FR-F10', 'Administrator moves an order to SHIPPED', 'PUT /orders/{id}/status as admin', '200, status SHIPPED', 'API', 'Med', 'Fail', 'SUP-28 (G-6)'),
  ]],
  ['6.7 Payment', [
    tc('TC-PAY-01', 'FR-G1, G2', 'Credit card payment masks the number', 'POST /users/payment, card 4111 1111 1111 1111', 'SUCCESS, TXN id, masked **** 1111', 'API', 'High', 'Pass', 'PAY-01'),
    tc('TC-PAY-02', 'FR-G1', 'Pay with UPI end to end', 'Checkout, choose UPI, pay', 'Order completed, confirmation shown', 'E2E', 'High', 'Pass', 'E2E-27'),
    tc('TC-PAY-03', 'FR-G1', 'Get payment for an order', 'GET /users/payment/order/{id}', 'Amount equals order total', 'API', 'Med', 'Pass', 'PAY-02'),
    tc('TC-PAY-04', 'FR-G7', 'Payment for an unknown order', 'POST payment with orderId 999999', '400', 'API', 'Med', 'Pass', 'PAY-03'),
    tc('TC-PAY-05', 'FR-G7', 'Invalid payment method or malformed JSON', 'POST payment with method "BITCOIN"', '400 with a clear message', 'API', 'Low', 'Fail', 'PAY-04'),
    tc('TC-PAY-06', 'FR-G4', 'Cannot pay for a cancelled order', 'Cancel, then pay', '400 "Cannot pay for a cancelled order"', 'API', 'High', 'Pass', 'PAY-05'),
    tc('TC-PAY-07', 'FR-G5', "Customer B cannot pay customer A's order", 'POST payment for A\'s order with B\'s token', 'Rejected', 'API', 'High', 'Fail', 'SUP-25 (G-3)'),
    tc('TC-PAY-08', 'FR-G6', 'Order becomes CONFIRMED only after payment', 'Place an order and read its status before paying', 'PENDING until payment succeeds', 'API', 'Med', 'Fail', 'SUP-26 (G-4)'),
    tc('TC-PAY-09', 'FR-G3', 'Real payment gateway', 'Pay with an invalid card number', 'Gateway declines the payment', 'Manual', 'High', 'Not implemented', 'Payments are simulated'),
    tc('TC-PAY-10', 'FR-G7', 'Open /payment directly', 'Log in; open /payment without checkout', 'Redirect to /checkout', 'E2E', 'Low', 'Fail', 'E2E-34 (UI-02)'),
    tc('TC-PAY-11', 'FR-G1, F1', 'Payment page places the order then pays', 'Component test: choose method, click Pay', 'placeOrder then processPayment; navigate to /confirmation/{id}', 'Unit', 'High', 'Pass', 'PaymentPage.test'),
  ]],
  ['6.8 Gift Points', [
    tc('TC-PTS-01', 'FR-H1', 'Earn 1 point per whole dollar', 'Place a $20.00 order, read the balance on the next order', 'Balance 20', 'API', 'High', 'Pass', 'SUP-14, SUP-15'),
    tc('TC-PTS-02', 'FR-H2', 'Redeem points lowers the total', 'Order with 66 points', 'Total reduced by $0.66', 'API', 'High', 'Pass', 'ORD-06'),
    tc('TC-PTS-03', 'FR-H2', 'Boundary: redeem more than the balance', 'Request 1000 with balance 20', 'Redeemed 20, total $19.80', 'API', 'High', 'Pass', 'SUP-15, SUP-16'),
    tc('TC-PTS-04', 'FR-H2', 'Boundary: discount larger than the total', 'Book $0.10, redeem 20 points', 'Total $0.00, never negative', 'API', 'High', 'Pass', 'SUP-17'),
    tc('TC-PTS-05', 'FR-H2', 'Negative points requested', 'POST /orders pointsToRedeem -50', '400, or treated as 0', 'API', 'High', 'Fail', 'SUP-18 (NEW-02)'),
    tc('TC-PTS-06', 'FR-H2', 'UI coerces negative or non-numeric points to 0', 'Type -5 or "abc" at checkout', 'Value becomes 0', 'Unit', 'Med', 'Pass', 'CheckoutPage.test'),
    tc('TC-PTS-07', 'FR-H3', 'Customer can see the gift point balance', 'Log in; open /orders', 'Current balance shown', 'API/Unit', 'Med', 'Fail', 'SUP-27 (G-5)'),
    tc('TC-PTS-08', 'FR-F6, BR', 'Cancelling twice must not credit points twice', 'Cancel an order with 20 points redeemed two times', 'Balance + 20 once only', 'API', 'High', 'Fail', 'SUP-31 (NEW-01)'),
  ]],
  ['6.9 Platform and Non-Functional', [
    tc('TC-PLAT-01', 'NFR-10', 'Swagger UI is reachable', 'GET /swagger-ui.html', '200', 'API', 'Low', 'Pass', 'SUP-13'),
    tc('TC-PLAT-02', 'NFR-4', 'Unknown resource returns 404', 'GET /products/999999', '404', 'API', 'Med', 'Fail', 'SUP-29 (G-7)'),
    tc('TC-PLAT-03', 'NFR-4', 'Missing token returns 401', 'GET /cart with no token', '401', 'API', 'Med', 'Fail', 'SUP-30 (G-7)'),
    tc('TC-PLAT-04', 'NFR-6', 'No uncaught JavaScript errors during a full journey', 'Run the E2E suite and watch the console', 'None', 'E2E', 'Med', 'Pass', 'E2E-36'),
    tc('TC-PLAT-05', 'NFR-7', 'Browser compatibility', 'Run main journey in Firefox, Edge, Safari', 'Works', 'Manual', 'Low', 'Not run', 'Only Chrome tested'),
    tc('TC-PLAT-06', 'NFR-1, NFR-2', 'Load test with concurrent users', 'Run 100 concurrent users on browse and order flows', 'Response times within target', 'Manual', 'Med', 'Not run', 'No load tooling used'),
    tc('TC-PLAT-07', 'NFR-5', 'Penetration test', 'Run an authenticated security scan', 'No high findings', 'Manual', 'Med', 'Not run', 'Not performed'),
    tc('TC-PLAT-08', 'NFR-11', 'Routing and shell', 'Render App routes, ProtectedRoute and 404 redirect', 'Correct page per route', 'Unit', 'Med', 'Pass', 'App.test, Navbar.test, AuthContext.test'),
    tc('TC-PLAT-09', 'NFR-4', 'API client behaviour', 'Check baseURL, bearer header and 401 handling', 'Header added; 401 clears session', 'Unit', 'Med', 'Pass', 'axiosClient.test, services.test'),
  ]],
]

const allCases = MODS.flatMap(m => m[1])
const resKey = (c) => c.result.startsWith('Not impl') ? 'Not implemented' : c.result
const cnt = (pred) => allCases.filter(pred).length
const nPass = cnt(c => c.result === 'Pass')
const nFail = cnt(c => c.result === 'Fail')
const nNI = cnt(c => c.result === 'Not implemented')
const nNR = cnt(c => c.result === 'Not run')
const nAll = allCases.length

// ---------- traceability ----------
const FR = {
  'A': 8, 'B': 8, 'C': 4, 'D': 8, 'E': 5, 'F': 10, 'G': 7, 'H': 3,
}
const frIds = []
for (const [k, n] of Object.entries(FR)) for (let i = 1; i <= n; i++) frIds.push(`FR-${k}${i}`)
const refsOf = (c) => {
  // expand "FR-A1, A3" and "FR-F1, G2" styles
  const out = []
  let lastPrefix = null
  c.ref.split(',').map(s => s.trim()).forEach(tok => {
    let m = tok.match(/^FR-([A-H])(\d+)$/)
    if (m) { lastPrefix = m[1]; out.push(`FR-${m[1]}${m[2]}`); return }
    m = tok.match(/^([A-H])(\d+)$/)
    if (m) { out.push(`FR-${m[1]}${m[2]}`); return }
    out.push(tok)
  })
  return out
}
const traceFor = (id) => allCases.filter(c => refsOf(c).includes(id))
const verdict = (cases) => {
  if (!cases.length) return 'No test'
  const ok = cases.filter(c => c.result === 'Pass').length
  const bad = cases.filter(c => c.result === 'Fail' || c.result === 'Not implemented').length
  if (bad && ok) return 'Partial'
  if (bad) return 'Fail'
  if (ok) return 'Pass'
  return 'Not run'
}
const frRows = frIds.map(id => {
  const cs = traceFor(id)
  return [id, cs.map(c => c.id.replace('TC-', '')).join(', ') || '-', verdict(cs)]
})
const nfrIds = Array.from({ length: 11 }, (_, i) => `NFR-${i + 1}`)
const nfrRows = nfrIds.map(id => {
  const cs = traceFor(id)
  return [id, cs.map(c => c.id.replace('TC-', '')).join(', ') || '-', verdict(cs)]
})
const frNoTest = frRows.filter(r => r[2] === 'No test').map(r => r[0])
const fv = (v) => frRows.filter(r => r[2] === v).length

// ---------- document ----------
const kids = []
kids.push(...titlePage({
  title: 'TEST CASES AND TEST RESULTS',
  subtitle: 'Backend API (ebookstore) and Web Application (ebookstore-ui)',
  meta: [
    ['Document version', '1.0 (Draft for review)'],
    ['Date', '12 November 2026'],
    ['Based on', 'BRD v1.0 (requirement IDs FR-, BR-, NFR-), HLD v1.0 and LLD v1.0'],
    ['Prepared by', '[Name to be added]'],
    ['Test basis', `${nAll} designed test cases, executed through automated API, unit and browser tests plus targeted probes`],
    ['Overall result', `${nPass} pass, ${nFail} fail, ${nNI} not implemented, ${nNR} not run`],
  ],
}))

kids.push(H1('Contents'))
;['1. Introduction', '2. Test Strategy', '3. Test Environment and Data', '4. Execution Summary',
  '5. Automated Test Evidence', '6. Test Cases (by module)', '7. Requirements Traceability Matrix',
  '8. Defect Register', '9. Not Run and Recommendations', '10. Entry and Exit Criteria'].forEach(t => kids.push(P(t, { spacing: { after: 40 } })))

// 1
kids.push(H1('1. Introduction'),
  P('This document lists the test cases that verify the E-Bookstore system against the Business Requirements Document, and records the result of each one. Every test case points to one or more BRD requirement IDs. Where a test was run by an automated script, its automated ID is shown in the Evidence column so the result can be re-checked.'),
  P('Result values: Pass = executed and met the expected result. Fail = executed and did not meet it. Not implemented = the BRD requires a feature the system does not provide. Not run = not executed yet and why.'),
)

// 2
kids.push(H1('2. Test Strategy'),
  table(['Level', 'Tool', 'Scope', 'Where it lives'], [
    ['API (black box)', 'PowerShell, Invoke-WebRequest', 'Every REST endpoint with valid, invalid, boundary and security inputs, against the live backend and database', 'ebookstore/api-tests/run-api-tests.ps1 and run-supplemental-tests.ps1'],
    ['UI unit and component', 'Vitest, Testing Library, jsdom', 'Components, pages, context and API client with mocked services', 'ebookstore-ui/src/**/*.test.jsx'],
    ['UI end-to-end', 'Playwright-core, Chrome headless', 'Real browser against the real UI, proxy, API and database', 'ebookstore-ui/e2e/run-e2e.mjs'],
    ['Manual / not run', 'n/a', 'Items needing database edits, other browsers, load or penetration tools', 'Section 9'],
  ], [1700, 2200, 3238, 2500], -1, { size: 17 }),
  gap(),
  ...bullets([
    'Techniques: positive and negative cases, boundary values (price 0, quantity 0, points above balance, discount above total, 48-hour limit), role-based access, data ownership between two customers, and input injection.',
    'Priority: High = core purchase journey, security or money. Medium = important but has a workaround. Low = cosmetic or rare.',
    'Tests for BRD gaps (G-1 to G-8) are written to the BRD requirement, so they fail today by design and become regression tests once the gap is closed.',
  ]),
)

// 3
kids.push(H1('3. Test Environment and Data'),
  table(['Item', 'Detail'], [
    ['Backend', 'Spring Boot 3.2.5, Java 17, http://localhost:8080'],
    ['Database', 'PostgreSQL 5432, ebookstore_db (seeded)'],
    ['Frontend', 'Vite dev server http://localhost:3000, proxies /api to 8080'],
    ['Browser', 'Google Chrome (headless for E2E)'],
    ['OS', 'Windows 10/11, PowerShell, Node 24'],
    ['Last automated run', '3 November 2026'],
  ], [2400, 7238]),
  gap(),
  table(['Test data', 'Value'], [
    ['Administrator', 'admin@bookstore.com / admin123 (seeded)'],
    ['Customers', 'Created per run with a unique timestamped email and password Passw0rd!'],
    ['Catalogue', 'Seeded categories Technology, Fiction, Science and 7 books. Test books are created by the scripts and removed (soft deleted) afterwards'],
    ['Cards and UPI', 'Card 4111 1111 1111 1111, any future expiry, CVV 123; UPI id x@upi. No real gateway is called'],
    ['Gift points', 'Built up by placing orders ($1 = 1 point)'],
  ], [2400, 7238]),
  note('The tests create customers, addresses and orders in the configured database. They do not delete them. Use a test database for repeat runs.'),
)

// 4
const typeCount = (t) => allCases.filter(c => c.type.split('/').includes(t)).length
kids.push(H1('4. Execution Summary'),
  table(['Result', 'Test cases', 'Share'], [
    ['Pass', String(nPass), `${Math.round(nPass / nAll * 100)}%`],
    ['Fail', String(nFail), `${Math.round(nFail / nAll * 100)}%`],
    ['Not implemented', String(nNI), `${Math.round(nNI / nAll * 100)}%`],
    ['Not run', String(nNR), `${Math.round(nNR / nAll * 100)}%`],
    ['Total', String(nAll), '100%'],
  ], [3000, 3000, 3638], 0),
  gap(),
  H2('4.1 By module'),
  table(['Module', 'Total', 'Pass', 'Fail', 'Not impl.', 'Not run'], MODS.map(m => {
    const cs = m[1]
    const c = (r) => String(cs.filter(x => x.result === r).length)
    return [m[0].replace(/^\d\.\d /, ''), String(cs.length), c('Pass'), c('Fail'), c('Not implemented'), c('Not run')]
  }), [3238, 1000, 1000, 1000, 1700, 1700]),
  gap(),
  H2('4.2 Requirement coverage'),
  P(`${frIds.length} functional requirements: ${fv('Pass')} fully verified (Pass), ${fv('Partial')} partly verified (some tests pass, some fail), ${fv('Fail')} failing, ${fv('Not run')} not run, ${fv('No test')} without a test case.`),
  note('A requirement is Partial when at least one linked test passes and at least one fails, for example removing a cart line works in some paths but not in others. See section 7.'),
)

// 5
kids.push(H1('5. Automated Test Evidence'),
  table(['Suite', 'Run', 'Pass', 'Fail', 'Notes'], [
    ['API tests (run-api-tests.ps1)', '52', '49', '3', 'Failures: CART-07, PAY-04, ADDR-05. Report: ebookstore/api-tests/test-report.md'],
    ['API supplemental (run-supplemental-tests.ps1)', '31', '16', '15', '9 failures are BRD gap tests (G-1..G-7). The other 6 failures show 5 new defects (NEW-01..05). Report: supplemental-report.md'],
    ['UI unit and component (Vitest)', '138', '138', '0', '15 files. Two tests are marked it.fails to document UI-01 and UI-02'],
    ['UI end-to-end (Playwright, Chrome)', '37', '33', '4', 'Failures: E2E-13 (UI-04), E2E-23 (CART-07), E2E-34 (UI-02), E2E-37 (UI-03). E2E-35 pagination skipped: only one page of data'],
    ['Targeted probes', '4', '4', '0', 'SQL injection text in search, delete an unused address, latency (20 calls), login response fields'],
  ], [2900, 700, 700, 700, 4638], -1, { size: 17 }),
  gap(),
  P('Each designed test case in section 6 maps to one or more of these automated tests. The same API script ran against live data, so these are real results, not simulated ones.'),
)

// 6
kids.push(H1('6. Test Cases (by module)'),
  P('Columns: BRD ref = requirement(s) tested. Type: API, Unit, E2E or Manual; second line is priority. Result line two is the evidence (automated test id or note).'))
for (const [title, cs] of MODS) {
  kids.push(H2(title))
  kids.push(table(
    ['TC ID', 'BRD ref', 'Scenario and steps', 'Expected result', 'Type\nPriority', 'Result\nEvidence'],
    cs.map(c => [c.id, c.ref.replace(/, /g, ',\n'), `${c.title}\n${c.steps}`, c.expected, `${c.type}\n${c.pri}`, `${c.result}\n${c.evidence}`]),
    [1000, 850, 3050, 2650, 800, 1288], 5, { size: 16 }))
  kids.push(gap())
}

// 7
kids.push(H1('7. Requirements Traceability Matrix'),
  H2('7.1 Functional requirements'),
  table(['Requirement', 'Test cases', 'Verdict'], frRows, [1600, 6038, 2000], 2, { size: 17 }),
  gap(),
  H2('7.2 Non-functional requirements'),
  table(['Requirement', 'Test cases', 'Verdict'], nfrRows, [1600, 6038, 2000], 2, { size: 17 }),
  note(frNoTest.length ? `Requirements without a test case: ${frNoTest.join(', ')}.` : 'Every functional requirement has at least one test case. NFR-3 (availability) and a few others have no test because they need infrastructure that does not exist yet.'),
)

// 8
kids.push(H1('8. Defect Register'),
  P('Defects 1 to 7 were found in the first test round. Defects NEW-01 to NEW-05 were found by the supplemental tests written for this document. No application code was changed.'),
  table(['ID', 'Description', 'Severity', 'Found by', 'Test case(s)'], [
    ['UI-04', 'Wrong password gives no message: the 401 triggers a page reload', 'High', 'E2E-13', 'TC-AUTH-08'],
    ['CART-07', 'Removing a cart line (or setting it to 0) does not delete it', 'High', 'CART-07, E2E-23', 'TC-CART-08, 09'],
    ['NEW-01', 'Cancelling an already cancelled order succeeds again and credits the redeemed points each time (points inflation)', 'High', 'SUP-20, SUP-31', 'TC-ORD-12, TC-PTS-08'],
    ['NEW-02', 'Negative pointsToRedeem is accepted: price goes up ($20.50 for a $20.00 book) and the balance rises by the same points (points inflation)', 'High', 'SUP-18', 'TC-PTS-05'],
    ['ADDR-05', 'Deleting an address used by an order returns 500', 'Medium', 'ADDR-05', 'TC-ADDR-06'],
    ['UI-03', 'Invalid JWT gives 403, so no automatic sign-out', 'Medium', 'E2E-37', 'TC-AUTH-12'],
    ['UI-01', 'Catalogue pagination never reaches page 2', 'Medium', 'Unit it.fails', 'TC-CAT-04'],
    ['NEW-05', 'No minimum password length: a 1-character password is accepted', 'Medium', 'SUP-04', 'TC-AUTH-13'],
    ['UI-02', '/payment opened directly is a blank page', 'Low', 'E2E-34', 'TC-PAY-10'],
    ['PAY-04', 'Unknown payment method or malformed JSON returns 500', 'Low', 'PAY-04', 'TC-PAY-05'],
    ['NEW-03', 'Duplicate ISBN returns 500', 'Low', 'SUP-03', 'TC-ADM-06'],
    ['NEW-04', 'Search without keyword returns 500', 'Low', 'SUP-07', 'TC-CAT-09'],
  ], [900, 4238, 900, 1500, 2100], 2, { size: 17 }),
  gap(),
  H2('8.1 BRD gaps confirmed by test'),
  table(['Gap', 'Requirement', 'Test case', 'Result today'], [
    ['G-1', 'FR-D8 Stock check', 'TC-CART-12', 'Adding 10 of a 3-stock book is accepted; an order of 10 sets stock to 0'],
    ['G-2', 'FR-F7 Cancel restores stock', 'TC-ORD-15', 'Stock stays reduced after cancel'],
    ['G-3', 'FR-G5 Payment ownership', 'TC-PAY-07', "Customer B paid customer A's order (200)"],
    ['G-4', 'FR-G6 Confirm after payment', 'TC-PAY-08', 'Status is CONFIRMED right after placement'],
    ['G-5', 'FR-H3 Show point balance', 'TC-PTS-07', 'Login response has no giftPoints'],
    ['G-6', 'FR-F10 Order status update', 'TC-ORD-18', 'No endpoint (500)'],
    ['G-7', 'NFR-4 Status codes', 'TC-PLAT-02, 03', '400 instead of 404; 403 instead of 401'],
    ['G-8', 'FR-C4 Admin screens', 'TC-ADM-10', 'No admin screens'],
  ], [700, 2700, 1700, 4538], -1, { size: 17 }),
  note('NEW-01 and NEW-02 let a customer create gift points without paying. They should be fixed before any other new defect. Suggested fixes: reject a cancel unless the status is PENDING or CONFIRMED, and validate pointsToRedeem is 0 or greater (@Min(0)).'),
)

// 9
kids.push(H1('9. Not Run and Recommendations'),
  table(['Test case', 'Why it was not run', 'What is needed'], [
    ['TC-ORD-10 48-hour boundary', 'Needs an order older than 48 hours', 'Update createdAt in a test database, or add a clock to the service'],
    ['TC-ORD-11 cancel SHIPPED/DELIVERED', 'The system cannot set these statuses (G-6)', 'Admin status endpoint, or direct DB update'],
    ['TC-CART-09 quantity 0', 'Same root cause as CART-07', 'Retest after the CART-07 fix'],
    ['TC-PLAT-05 other browsers', 'Only Chrome available', 'Run the E2E suite with Firefox/Edge/WebKit'],
    ['TC-PLAT-06 load test', 'No load tool used', 'k6 or JMeter against a staging copy'],
    ['TC-PLAT-07 penetration test', 'Out of scope for this round', 'OWASP ZAP or a manual review'],
  ], [3000, 3200, 3438], -1, { size: 17 }),
  gap(),
  H2('Recommendations'),
  ...bullets([
    'Fix NEW-01 and NEW-02 first (points can be created from nothing), then CART-07 and UI-04 (core journey).',
    'Add the stock check (G-1) and the payment ownership check (G-3) before go-live.',
    'Run the three automated suites in a test database that can be reset between runs; never run EbookstoreApplicationTests on the live database (create-drop).',
    'After each fix, re-run the matching suite and update this document. Tests for gaps flip to Pass automatically when the gap is closed.',
  ]),
)

// 10
kids.push(H1('10. Entry and Exit Criteria'),
  table(['Criteria', 'Definition', 'Status'], [
    ['Entry', 'Backend, database and UI start without errors; seeded data present; BRD approved', 'Met'],
    ['Exit: coverage', 'Every Must requirement has at least one executed test case', 'Met'],
    ['Exit: high-severity defects', 'No open High severity defects', 'Not met: UI-04, CART-07, NEW-01, NEW-02'],
    ['Exit: core journey', 'Register, browse, cart, checkout, pay and cancel pass end to end', 'Met, with the cart-removal defect'],
    ['Exit: regression', 'All suites re-run after fixes with no new failures', 'Pending fixes'],
  ], [2000, 5238, 2400], 2, { size: 17 }),
  gap(),
  P('Assumptions: the Date, Prepared by and sign-off fields are for the team to complete. Severity ratings are the tester\'s proposal for review.'),
)

build(OUT, {
  title: 'E-Bookstore Test Cases and Results',
  headerText: 'E-Bookstore Test Cases and Results',
  footerText: 'Draft v1.0',
  kids,
})
console.log(`cases=${nAll} pass=${nPass} fail=${nFail} notImpl=${nNI} notRun=${nNR}`)
console.log(`FR pass=${fv('Pass')} partial=${fv('Partial')} fail=${fv('Fail')} notrun=${fv('Not run')} none=${fv('No test')} :: ${frNoTest.join(',')}`)
