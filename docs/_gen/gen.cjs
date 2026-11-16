const fs = require('fs')
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, Footer, Header, PageNumber, BorderStyle, PageBreak, LevelFormat,
} = require('docx')

const OUT = process.argv[2]
const W = 9638 // content width in DXA (A4 with 2 cm margins)
const NAVY = '1F3864'

// ---------- helpers ----------
const run = (t, o = {}) => new TextRun({ text: t, ...o })
const P = (t, o = {}) => new Paragraph({ spacing: { after: 100 }, ...o, children: Array.isArray(t) ? t : [run(t)] })
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(t)] })
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(t)] })
const bullet = (t) => new Paragraph({ numbering: { reference: 'bul', level: 0 }, spacing: { after: 60 }, children: Array.isArray(t) ? t : [run(t)] })
const bullets = (arr) => arr.map(bullet)
const note = (t) => new Paragraph({
  spacing: { before: 60, after: 120 },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: '2E75B6', space: 8 } },
  children: [run(t, { italics: true, color: '404040' })],
})

const STATUS_FILL = { Implemented: 'E2F0D9', Partial: 'FFF2CC', 'Not implemented': 'F8D7DA' }
const statusKey = (c) => {
  const first = String(c).split('\n')[0]
  return first.startsWith('Not') ? 'Not implemented' : first.startsWith('Partial') ? 'Partial' : first.startsWith('Implemented') ? 'Implemented' : null
}
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const borders = { top: border, bottom: border, left: border, right: border }

function cell(text, width, o = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA }, borders,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined,
    children: String(text).split('\n').map(l => new Paragraph({
      spacing: { after: 0 },
      children: [run(l, { bold: o.bold, color: o.color, size: o.size || 19 })],
    })),
  })
}
function table(headers, rows, widths, statusCol = -1) {
  const head = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((h, i) => cell(h, widths[i], { bold: true, color: 'FFFFFF', fill: NAVY })),
  })
  const body = rows.map(r => new TableRow({
    cantSplit: true,
    children: r.map((c, i) => cell(c, widths[i], {
      fill: i === statusCol ? STATUS_FILL[statusKey(c)] : undefined,
      bold: i === 0,
    })),
  }))
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: widths, rows: [head, ...body] })
}
const gap = () => P('', { spacing: { after: 60 } })

// ---------- requirement data ----------
const FR_W = [820, 5418, 1000, 2400]
const FR_H = ['ID', 'Requirement', 'Priority', 'Status']

const modules = [
  ['5.1 Account and Access', [
    ['FR-A1', 'A visitor can register with first name, last name, email and password. The account is created with the CUSTOMER role and the user is signed in immediately.', 'Must', 'Implemented'],
    ['FR-A2', 'Email must be valid and unique. A duplicate email is rejected with a clear message.', 'Must', 'Implemented'],
    ['FR-A3', 'A registered user can sign in with email and password and receives an access token valid for 24 hours.', 'Must', 'Implemented'],
    ['FR-A4', 'A failed sign-in must show the user an error message.', 'Must', 'Partial\nNo message shown (UI-04)'],
    ['FR-A5', 'The session survives a page reload. The user can sign out, which clears the session.', 'Must', 'Implemented'],
    ['FR-A6', 'Cart, checkout, payment, confirmation and order pages redirect anonymous visitors to the sign-in page.', 'Must', 'Implemented'],
    ['FR-A7', 'An expired or invalid session signs the user out automatically.', 'Should', 'Partial\nBackend returns 403, not 401 (UI-03)'],
    ['FR-A8', 'An administrator account exists for catalogue management (created automatically on first start).', 'Must', 'Implemented'],
  ]],
  ['5.2 Catalogue and Search', [
    ['FR-B1', 'The home page shows a hero banner, category shortcuts and the 8 top-rated books.', 'Should', 'Implemented'],
    ['FR-B2', 'Customers can browse all active books, 20 per page, in order of date added.', 'Must', 'Partial\nOnly page 1 reachable (UI-01)'],
    ['FR-B3', 'Customers can filter books by category.', 'Must', 'Implemented'],
    ['FR-B4', 'Customers can search by keyword. Matching is case-insensitive and partial, across title, author and publisher.', 'Must', 'Implemented'],
    ['FR-B5', 'The book detail page shows title, author, publisher, category, price, rating, stock status, description, ISBN, publication date and estimated delivery date.', 'Must', 'Implemented'],
    ['FR-B6', 'The detail page lists up to 6 related books from the same category.', 'Should', 'Implemented'],
    ['FR-B7', 'Out-of-stock books are clearly marked and cannot be added to the cart from the catalogue or detail page.', 'Must', 'Implemented'],
    ['FR-B8', 'Opening a book that does not exist returns the user to the catalogue.', 'Could', 'Implemented'],
  ]],
  ['5.3 Catalogue Management (Administrator)', [
    ['FR-C1', 'An administrator can create, update and remove books (title, author, ISBN, price greater than 0, stock, category). Removal is a soft delete.', 'Must', 'Implemented\n(API only)'],
    ['FR-C2', 'An administrator can create, update and delete categories.', 'Must', 'Implemented\n(API only)'],
    ['FR-C3', 'Customers and visitors are blocked from all catalogue write operations.', 'Must', 'Implemented'],
    ['FR-C4', 'Web screens for administrators to manage books, categories and orders.', 'Should', 'Not implemented'],
  ]],
  ['5.4 Shopping Cart', [
    ['FR-D1', 'A customer can add a book to the cart with a quantity of at least 1. Adding a book already in the cart increases its quantity.', 'Must', 'Implemented'],
    ['FR-D2', 'The cart shows each line with unit price, quantity and subtotal, plus the cart total.', 'Must', 'Implemented'],
    ['FR-D3', 'A customer can change the quantity of a cart line.', 'Must', 'Implemented'],
    ['FR-D4', 'A customer can remove a single line from the cart.', 'Must', 'Partial\nItem reappears (CART-07)'],
    ['FR-D5', 'The navigation bar shows the number of lines in the cart.', 'Should', 'Implemented'],
    ['FR-D6', 'The cart page suggests books taken from the customer\'s most recent order.', 'Could', 'Implemented'],
    ['FR-D7', 'The cart is stored on the server per customer and is kept between sessions.', 'Must', 'Implemented'],
    ['FR-D8', 'The quantity in the cart must not exceed the stock available.', 'Must', 'Not implemented'],
  ]],
  ['5.5 Delivery Addresses and Checkout', [
    ['FR-E1', 'A customer can add, list, update and delete delivery addresses.', 'Must', 'Partial\nWeb app offers add and select only'],
    ['FR-E2', 'One address can be marked as default. The default (or first) address is preselected at checkout.', 'Should', 'Implemented'],
    ['FR-E3', 'Checkout cannot continue until a delivery address is selected.', 'Must', 'Implemented'],
    ['FR-E4', 'At checkout the customer can redeem gift points (rules in section 6).', 'Must', 'Implemented'],
    ['FR-E5', 'An address already used by an order cannot be deleted, and the customer sees a clear message instead of an error.', 'Should', 'Partial\nServer error 500 (ADDR-05)'],
  ]],
  ['5.6 Orders', [
    ['FR-F1', 'A customer can place an order from the cart. Each order gets a unique number in the form ORD-XXXXXXXX.', 'Must', 'Implemented'],
    ['FR-F2', 'Placing an order records the unit price of each line, reduces stock and empties the cart.', 'Must', 'Implemented'],
    ['FR-F3', 'A customer can view their own order history (newest first, 10 per page) and order details.', 'Must', 'Implemented'],
    ['FR-F4', 'A customer cannot see another customer\'s orders.', 'Must', 'Implemented'],
    ['FR-F5', 'A customer can cancel an order within 48 hours of placing it, as long as it has not shipped or been delivered.', 'Must', 'Implemented'],
    ['FR-F6', 'Cancelling an order returns the gift points that were redeemed on it.', 'Must', 'Implemented'],
    ['FR-F7', 'Cancelling an order returns the books to stock and reverses the points earned.', 'Should', 'Not implemented'],
    ['FR-F8', '"Buy Again" adds every line of a past order back into the cart.', 'Should', 'Implemented'],
    ['FR-F9', 'After payment the customer sees a confirmation page with order number, items, address and total.', 'Must', 'Implemented'],
    ['FR-F10', 'Order status can move to SHIPPED and DELIVERED, updated by an administrator.', 'Should', 'Not implemented\n(no way to set status)'],
  ]],
  ['5.7 Payment', [
    ['FR-G1', 'The customer can choose credit card, debit card, net banking, UPI or gift points.', 'Must', 'Implemented\n(simulated)'],
    ['FR-G2', 'Only the last four digits of a card number are stored and shown.', 'Must', 'Implemented'],
    ['FR-G3', 'Payments are processed by a real payment gateway.', 'Must (for go-live)', 'Not implemented\n(always succeeds)'],
    ['FR-G4', 'A cancelled order cannot be paid.', 'Must', 'Implemented'],
    ['FR-G5', 'Only the customer who owns an order can pay for it.', 'Must', 'Not implemented'],
    ['FR-G6', 'An order becomes CONFIRMED only after payment succeeds.', 'Should', 'Not implemented\n(confirmed when placed)'],
    ['FR-G7', 'Invalid payment input (for example an unknown method) returns a clear validation message.', 'Should', 'Partial\nServer error 500 (PAY-04)'],
  ]],
  ['5.8 Gift Points (Loyalty)', [
    ['FR-H1', 'Customers earn 1 gift point for each whole dollar of the order total paid.', 'Should', 'Implemented'],
    ['FR-H2', 'Customers can redeem points at checkout (1 point = $0.01).', 'Should', 'Implemented'],
    ['FR-H3', 'The customer can see their current gift point balance.', 'Should', 'Partial\nAlways shows 0'],
  ]],
]
const allRows = modules.flatMap(m => m[1])
const cnt = (k) => allRows.filter(r => statusKey(r[3]) === k).length
const nImpl = cnt('Implemented'), nPart = cnt('Partial'), nNot = cnt('Not implemented'), nAll = allRows.length

// ---------- document body ----------
const kids = []

// Title page
kids.push(
  P('', { spacing: { before: 2400 } }),
  new Paragraph({ spacing: { after: 120 }, children: [run('BUSINESS REQUIREMENTS DOCUMENT', { bold: true, size: 44, color: NAVY })] }),
  new Paragraph({ spacing: { after: 200 }, children: [run('E-Bookstore Platform (BookHaven)', { size: 32, color: '2E75B6' })] }),
  new Paragraph({ spacing: { after: 400 }, children: [run('Backend API (ebookstore) and Web Application (ebookstore-ui)', { size: 24, color: '595959' })] }),
  table(['Item', 'Detail'], [
    ['Document version', '1.0 (Draft for review)'],
    ['Date', '12 November 2026'],
    ['Project', 'AI Capstone Project, E-Bookstore'],
    ['Systems covered', 'ebookstore (Spring Boot REST API) and ebookstore-ui (React web application)'],
    ['Prepared by', '[Name to be added]'],
    ['Basis', 'Reverse-documented from the working system: source code, automated test runs and the live application'],
  ], [2400, 7238]),
  new Paragraph({ children: [new PageBreak()] }),
)

// Contents
kids.push(H1('Contents'))
;['1. Executive Summary', '2. Business Context and Objectives', '3. Scope', '4. Stakeholders and User Roles',
  '5. Functional Requirements', '6. Business Rules', '7. Customer Journey', '8. Non-Functional Requirements',
  '9. Data Requirements', '10. System Interfaces', '11. Assumptions, Constraints and Dependencies',
  '12. Risks', '13. Current Gaps and Known Defects', '14. Acceptance Criteria and Test Evidence',
  '15. Future Enhancements', '16. Approval', 'Appendix A: Glossary'].forEach(t => kids.push(P(t, { spacing: { after: 40 } })))
kids.push(gap(), note('Status column: "Implemented" means it works today. "Partial" means it exists but a defect or limitation stops it meeting the requirement. "Not implemented" means the system does not yet meet it.'))

// 1
kids.push(H1('1. Executive Summary'),
  P('BookHaven is an online bookstore where customers browse a catalogue of books, add them to a cart, pay, and track or cancel their orders. Customers earn gift points that reduce the price of later orders. The solution has two parts that work together:'),
  bullet([run('ebookstore: ', { bold: true }), run('the server side. A REST API that holds the books, customers, carts, orders and payments in a PostgreSQL database and enforces the business rules.')]),
  bullet([run('ebookstore-ui: ', { bold: true }), run('the web application customers use in a browser. It calls the API for every action.')]),
  P('This document sets out what the business needs from the combined system, the rules it must follow, and how well the current version meets those needs. The current version delivers the complete purchase journey from registration to order cancellation, using seeded sample data (3 categories, 7 books, 1 administrator). Payment is simulated and is not connected to a real payment provider.'),
  P(`Of the ${nAll} functional requirements listed, ${nImpl} are fully met, ${nPart} are partly met because of defects or limits, and ${nNot} are not yet implemented. The items that matter most before a public launch are in section 13: removing items from the cart, a real payment gateway, a stock check at order time, and the sign-in error message.`),
)

// 2
kids.push(H1('2. Business Context and Objectives'),
  H2('2.1 Business problem'),
  P('The business wants to sell books online directly to readers, with a simple shopping experience, delivery information up front, and a loyalty incentive that brings customers back. A single system is needed so the catalogue, stock, orders and payments are managed in one place.'),
  H2('2.2 Objectives'),
  table(['ID', 'Business objective', 'How it is measured'], [
    ['OBJ-1', 'Let customers find a book quickly.', 'Search and category filter return results; a book can be found and opened in a few clicks.'],
    ['OBJ-2', 'Let customers buy with as few steps as possible.', 'Cart to confirmed order in 3 steps: address, payment, confirmation.'],
    ['OBJ-3', 'Encourage repeat purchases.', 'Gift points earned on every order and redeemable on the next; "Buy Again" from order history.'],
    ['OBJ-4', 'Keep customers in control of their orders.', 'Customers can view history and cancel within 48 hours.'],
    ['OBJ-5', 'Keep catalogue and customer data accurate and protected.', 'Only administrators change the catalogue; customers see only their own data; passwords and card numbers are never shown.'],
    ['OBJ-6', 'Be ready to run with real customers.', 'Open items in section 13 are closed; real payment gateway in place.'],
  ], [900, 3900, 4838]),
)

// 3
kids.push(H1('3. Scope'),
  H2('3.1 In scope'),
  ...bullets(['Customer registration, sign-in and sign-out',
    'Catalogue browsing, category filter, keyword search, book detail, related books',
    'Shopping cart, delivery addresses, checkout',
    'Order placement, order history, order cancellation, "Buy Again"',
    'Payment recording for five payment methods (simulated)',
    'Gift points: earning and redeeming',
    'Administrator management of books and categories through the API',
    'Interactive API documentation (Swagger UI)']),
  H2('3.2 Out of scope for this version'),
  ...bullets(['Real payment gateway and refunds',
    'Administrator screens in the web application',
    'Order shipping and delivery updates, courier integration',
    'Entry of customer reviews and ratings (ratings are stored values only)',
    'Email or SMS notifications, password reset, profile editing',
    'Taxes, discount coupons, wish lists',
    'Mobile application']),
)

// 4
kids.push(H1('4. Stakeholders and User Roles'),
  table(['Role', 'Description', 'What they can do'], [
    ['Visitor', 'Anyone who has not signed in.', 'Browse home, catalogue, search, view book details and related books. Register or sign in.'],
    ['Customer', 'A registered, signed-in user (role CUSTOMER).', 'Everything a visitor can, plus: cart, addresses, checkout, payment, order history, cancel, Buy Again, gift points.'],
    ['Administrator', 'Store staff (role ADMIN). One account is created automatically.', 'Everything a customer can, plus: create, update and remove books and categories (through the API / Swagger UI).'],
    ['Business owner', 'Sponsor of the store.', 'Approves this document and the go-live decision.'],
    ['Development / operations team', 'Builds, tests and runs the system.', 'Deployment, database, configuration, monitoring.'],
  ], [1900, 3200, 4538]),
)

// 5
kids.push(H1('5. Functional Requirements'),
  P('Priority uses MoSCoW: Must (needed for launch), Should (important), Could (nice to have). A summary of statuses is in section 14.1.'),
)
modules.forEach(([title, rows]) => kids.push(H2(title), table(FR_H, rows, FR_W, 3), gap()))

// 6
kids.push(H1('6. Business Rules'),
  table(['ID', 'Rule', 'Notes'], [
    ['BR-01', 'Currency is US dollars ($). Shipping is shown as "Free". No tax is charged.', 'Totals are the sum of unit price x quantity.'],
    ['BR-02', 'Email addresses are unique. A new account always has the CUSTOMER role.', 'Administrator accounts are not created through registration.'],
    ['BR-03', 'A book price must be greater than 0. Stock defaults to 0 if not given.', 'Title, author and ISBN are mandatory.'],
    ['BR-04', 'Removing a book from the catalogue hides it but keeps it in past orders.', 'Soft delete.'],
    ['BR-05', 'The price of each line is fixed at the moment the order is placed.', 'Later price changes do not alter past orders.'],
    ['BR-06', 'Redeeming points: 1 point = $0.01. A customer can redeem no more than their balance. The order total cannot go below $0.', 'Example: 100 points = $1.00 off.'],
    ['BR-07', 'Earning points: 1 point per whole dollar of the order total after any discount. Cents are dropped.', 'Example: a $34.99 order earns 34 points.'],
    ['BR-08', 'An order can be cancelled within 48 hours of being placed, and not once it is SHIPPED or DELIVERED.', 'After 48 hours the customer is told it can no longer be cancelled.'],
    ['BR-09', 'Cancelling an order gives back the points redeemed on it.', 'Points earned on the order and the stock are not reversed today (see FR-F7).'],
    ['BR-10', 'Placing an order lowers stock by the quantity ordered; stock never goes below 0.', 'The order is not blocked when stock is too low (see FR-D8).'],
    ['BR-11', 'Order numbers look like ORD-1A2B3C4D. Payment references look like TXN-1A2B3C4D5E6F.', 'Generated automatically.'],
    ['BR-12', 'Card numbers are masked (**** **** **** 1234). Only the masked value is stored.', ''],
    ['BR-13', 'A customer can only see and cancel their own orders.', ''],
    ['BR-14', 'Each book has an estimated delivery date set by the store.', 'Shown on cards and the detail page.'],
    ['BR-15', 'Order status values: PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED. A new order starts as CONFIRMED. Payment status values: PENDING, SUCCESS, FAILED, REFUNDED.', 'Today a payment is always recorded as SUCCESS.'],
  ], [900, 5438, 3300]),
)

// 7
kids.push(H1('7. Customer Journey'),
  P('The normal path through the system, with the system response at each step:'),
  table(['Step', 'Customer action', 'System response'], [
    ['1', 'Opens the site, browses or searches.', 'Shows books with price, rating, stock and estimated delivery.'],
    ['2', 'Opens a book.', 'Shows full details and up to 6 related books.'],
    ['3', 'Clicks "+ Cart" or "Add to Cart".', 'If not signed in, goes to sign-in. Otherwise adds the book and updates the cart count.'],
    ['4', 'Opens the cart, adjusts quantities.', 'Recalculates line subtotals and total; suggests books from the last order.'],
    ['5', 'Clicks "Proceed to Checkout".', 'Lists saved addresses (or shows the new-address form). Offers gift point redemption.'],
    ['6', 'Selects an address, enters points to redeem, continues.', 'Shows the discounted total.'],
    ['7', 'Chooses a payment method and pays.', 'Places the order, records the payment, clears the cart, reduces stock, awards points.'],
    ['8', 'Sees the confirmation page.', 'Shows order number, items, address, total and the 48-hour cancellation note.'],
    ['9', 'Later opens "Orders".', 'Lists orders. The customer can expand one, cancel it (within 48 hours), or "Buy Again".'],
  ], [700, 4000, 4938]),
)

// 8
kids.push(H1('8. Non-Functional Requirements'),
  P('"Current" describes how the system behaves today. "Proposed" is a target for the business to confirm; none of the proposed targets have been measured yet.'),
  table(['ID', 'Area', 'Requirement', 'Basis'], [
    ['NFR-1', 'Security', 'Sign-in uses signed tokens (JWT) that expire after 24 hours. Passwords are stored hashed. Customer and administrator functions are separated by role.', 'Current'],
    ['NFR-2', 'Security', 'All traffic in production must use HTTPS.', 'Proposed'],
    ['NFR-3', 'Security', 'Production must not use the default administrator password, the sample database password, or the sample token secret held in the source code. Secrets must come from the environment.', 'Proposed'],
    ['NFR-4', 'Security', 'Unauthenticated requests to protected data must be answered with 401 (today they return 403).', 'Proposed'],
    ['NFR-5', 'Performance', 'Catalogue and search pages respond in under 2 seconds for the expected catalogue size.', 'Proposed'],
    ['NFR-6', 'Availability', 'Service available during store hours; database backed up daily.', 'Proposed'],
    ['NFR-7', 'Usability', 'The web application adapts to phone, tablet and desktop widths (menu collapses on small screens). Errors are shown as readable messages.', 'Current (errors: see FR-A4)'],
    ['NFR-8', 'Compatibility', 'Current versions of Chrome, Edge, Firefox and Safari.', 'Proposed (tested on Chrome only)'],
    ['NFR-9', 'Maintainability', 'Automated tests cover the API and the web application and can be run on demand. The API is documented in Swagger UI.', 'Current'],
    ['NFR-10', 'Data integrity', 'Database changes that belong together (order, stock, points, cart) happen in one transaction.', 'Current'],
    ['NFR-11', 'Portability', 'Runs on Java 17, PostgreSQL 14 or later, and any modern web server for the static web files.', 'Current'],
  ], [820, 1300, 5518, 2000]),
)

// 9
kids.push(H1('9. Data Requirements'),
  H2('9.1 Information the system keeps'),
  table(['Data', 'Key contents'], [
    ['User', 'First name, last name, email (unique), hashed password, role, gift point balance.'],
    ['Address', 'Full name, street, city, state, postal code, country, phone, default flag; belongs to a user.'],
    ['Category', 'Name, description, image.'],
    ['Product (book)', 'Title, author, ISBN, price, stock, brand/publisher, description, image, publication date, rating, review count, estimated delivery date, active flag, category.'],
    ['Cart and cart items', 'One cart per user; each item has a book and a quantity.'],
    ['Order and order items', 'Order number, status, customer, delivery address, total, points redeemed, created and cancelled times; each item has a book, quantity and unit price.'],
    ['Payment', 'Order, amount, method (credit card, debit card, net banking, UPI, gift points), status, transaction reference, masked card number, processed time.'],
  ], [2200, 7438]),
  H2('9.2 Starting data'),
  P('On first start with empty tables the system creates the following so it can be used straight away:'),
  ...bullets(['Administrator: admin@bookstore.com (change the password before go-live).',
    'Categories: Technology, Fiction, Science.',
    'Books: Clean Code, The Pragmatic Programmer, Designing Data-Intensive Applications (Technology); 1984, To Kill a Mockingbird (Fiction); A Brief History of Time, Cosmos (Science).']),
  H2('9.3 Retention'),
  P('Orders, payments and removed books are kept (no hard deletion of books) so that history stays correct. A retention period and privacy policy have not been defined and need to be agreed by the business.'),
)

// 10
kids.push(H1('10. System Interfaces'),
  H2('10.1 Architecture'),
  table(['Part', 'Technology', 'Role'], [
    ['Web application', 'React 18, Vite, React Router, Axios', 'Screens for customers. Calls the API using the relative address /api.'],
    ['API', 'Java 17, Spring Boot 3.2.5, Spring Security with JWT, Spring Data JPA', 'Business rules, security, data access. Runs on port 8080.'],
    ['Database', 'PostgreSQL (database ebookstore_db)', 'Stores all data. Tables are created and updated automatically at start-up.'],
    ['Documentation', 'Swagger UI (springdoc 2.5.0)', 'Lets staff read and try the API in a browser.'],
  ], [2000, 3800, 3838]),
  note('The web application and the API must be served from the same address (a web server forwards /api to the API). The API has no cross-origin (CORS) settings, so hosting them on different domains would fail.'),
  H2('10.2 API summary'),
  table(['Area', 'Endpoints', 'Access'], [
    ['Authentication', 'POST /api/auth/register, POST /api/auth/login', 'Public'],
    ['Books', 'GET /api/products, /{id}, /category/{id}, /search, /{id}/related', 'Public'],
    ['Books (manage)', 'POST /api/products, PUT and DELETE /api/products/{id}', 'Administrator'],
    ['Categories', 'GET /api/categories, /{id}', 'Public'],
    ['Categories (manage)', 'POST /api/categories, PUT and DELETE /api/categories/{id}', 'Administrator'],
    ['Cart', 'GET /api/cart; POST /api/cart/items; PUT and DELETE /api/cart/items/{id}; DELETE /api/cart', 'Signed-in user'],
    ['Orders', 'POST /api/orders; GET /api/orders, /{id}; PUT /api/orders/{id}/cancel', 'Signed-in user'],
    ['Addresses', 'GET and POST /api/users/addresses; PUT and DELETE /api/users/addresses/{id}', 'Signed-in user'],
    ['Payment', 'POST /api/users/payment; GET /api/users/payment/order/{orderId}', 'Signed-in user'],
    ['Documentation', '/swagger-ui.html, /api-docs', 'Public (restrict in production)'],
  ], [1900, 5638, 2100]),
  P('Responses use a common envelope with success, message and data. Lists are paged.'),
  H2('10.3 External systems'),
  P('None today. A payment gateway is the main external integration still to be added (FR-G3).'),
)

// 11
kids.push(H1('11. Assumptions, Constraints and Dependencies'),
  H2('11.1 Assumptions'),
  ...bullets(['Customers have a modern web browser and an internet connection.',
    'One currency (US dollars) and one language (English) are enough for launch.',
    'The store handles delivery itself; no courier system is connected.',
    'Gift points have no expiry and no cash value outside discounts.']),
  H2('11.2 Constraints'),
  ...bullets(['The solution uses Java 17, Spring Boot, React and PostgreSQL, as already built.',
    'The web application and API must be served from the same web address (see section 10.1).',
    'The automated test class EbookstoreApplicationTests recreates the database tables and must never be run against live data.']),
  H2('11.3 Dependencies'),
  ...bullets(['A running PostgreSQL 14+ server and a database named ebookstore_db.',
    'A payment provider contract and credentials before real payments can be taken.',
    'A web server (for example nginx) and an HTTPS certificate for production.']),
)

// 12
kids.push(H1('12. Risks'),
  table(['ID', 'Risk', 'Impact', 'Mitigation'], [
    ['R-1', 'Payments are simulated and always succeed; orders could be treated as paid when they are not.', 'High', 'Integrate a payment gateway; confirm orders only after payment (FR-G3, FR-G6).'],
    ['R-2', 'No stock check at cart or order time; more copies can be sold than exist.', 'High', 'Validate stock when adding to cart and when placing the order (FR-D8).'],
    ['R-3', 'Default administrator password and token secret are in the source code.', 'High', 'Replace before go-live; load secrets from the environment (NFR-3).'],
    ['R-4', 'Any signed-in user can pay for any order number.', 'Medium', 'Check order ownership in the payment step (FR-G5).'],
    ['R-5', 'Cart item removal does not work; customers cannot correct their cart.', 'Medium', 'Fix CART-07 before launch.'],
    ['R-6', 'Test runs add sample customers and orders to the database.', 'Low', 'Use a separate test database; clean the live database before launch.'],
    ['R-7', 'Privacy and data retention rules are undefined.', 'Medium', 'Business to define policy; add account deletion and export if required.'],
  ], [700, 4338, 1000, 3600]),
)

// 13
kids.push(H1('13. Current Gaps and Known Defects'),
  P('Found by reading the code and by running automated tests against the live system. IDs match the test reports.'),
  H2('13.1 Defects'),
  table(['ID', 'Severity', 'Problem', 'Effect on the business'], [
    ['UI-04', 'High', 'A wrong password on the sign-in page shows no message; the page just reloads.', 'Customers think the site is broken and may leave.'],
    ['CART-07', 'High', 'Removing a single cart line (or setting its quantity to 0) reports success but the line stays.', 'Customers cannot fix their cart and may order unwanted items.'],
    ['ADDR-05', 'Medium', 'Deleting an address used by an order causes a server error (500) with a technical message.', 'Confusing for customers; leaks technical detail.'],
    ['UI-03', 'Medium', 'An expired or invalid session is not detected; the user stays "signed in" and pages load empty.', 'Customers are stuck until they clear the browser data.'],
    ['UI-01', 'Medium', 'Catalogue page buttons never move to another page.', 'Hidden today; matters once the catalogue exceeds 20 books.'],
    ['UI-02', 'Low', 'Opening the payment page directly shows a blank screen.', 'Minor; only seen when the link is opened by hand.'],
    ['PAY-04', 'Low', 'An unknown payment method or malformed request returns a server error instead of a validation message.', 'Poor error handling; no customer impact through the web app.'],
  ], [1150, 1000, 4188, 3300]),
  H2('13.2 Requirement gaps found in the code'),
  table(['Ref', 'Gap', 'Requirement'], [
    ['G-1', 'No stock check when adding to the cart or placing an order.', 'FR-D8'],
    ['G-2', 'Cancelling an order does not return books to stock or reverse earned points.', 'FR-F7'],
    ['G-3', 'Payment does not check that the order belongs to the caller.', 'FR-G5'],
    ['G-4', 'Orders are marked CONFIRMED when placed, before payment.', 'FR-G6'],
    ['G-5', 'The gift point balance is never shown to the customer.', 'FR-H3'],
    ['G-6', 'There is no way to move an order to SHIPPED or DELIVERED.', 'FR-F10'],
    ['G-7', 'Unknown records return error 400 rather than 404, and unauthenticated calls return 403 rather than 401.', 'NFR-4'],
    ['G-8', 'Administrators have no screens; they must use Swagger UI.', 'FR-C4'],
  ], [900, 6538, 2200]),
)

// 14
kids.push(H1('14. Acceptance Criteria and Test Evidence'),
  H2('14.1 Requirement status'),
  table(['Status', 'Count', 'Meaning'], [
    ['Implemented', String(nImpl), 'Meets the requirement today.'],
    ['Partial', String(nPart), 'Exists but a defect or limitation stops it fully meeting the requirement.'],
    ['Not implemented', String(nNot), 'Not yet built.'],
    ['Total functional requirements', String(nAll), ''],
  ], [3000, 1200, 5438]),
  H2('14.2 Automated test results'),
  table(['Test set', 'What it covers', 'Run', 'Passed', 'Failed'], [
    ['API tests (live backend)', 'Catalogue, search, sign-up and sign-in, role checks, admin catalogue changes, cart, addresses, orders, points, payment, cancel', '52', '49', '3'],
    ['Web unit and component tests', 'Every page, shared components, sign-in state, API call contract', '138', '138', '0'],
    ['Web end-to-end tests (real Chrome, live backend)', 'Full journey: browse, register, cart, checkout, pay, confirm, orders, cancel', '37', '33', '4'],
  ], [2300, 4038, 900, 1200, 1200]),
  P('The failures are the defects in section 13.1. Two web unit tests are written as "expected to fail" for UI-01 and UI-02, so they report as passed until those defects are fixed.'),
  H2('14.3 Acceptance criteria for go-live'),
  ...bullets(['All defects in section 13.1 with severity High or Medium are fixed and their tests pass.',
    'All "Must" requirements are Implemented, including a real payment gateway (FR-G3) and the stock check (FR-D8).',
    'Default administrator password, token secret and database password are replaced; the site runs over HTTPS.',
    'The full automated test set passes against a clean test environment.',
    'The business owner completes a manual walk-through of the customer journey (section 7) and signs off.']),
)

// 15
kids.push(H1('15. Future Enhancements'),
  ...bullets(['Administrator screens: books, categories, orders and shipping status.',
    'Email notifications for registration, order confirmation, shipping and cancellation.',
    'Password reset and profile page; view and edit saved addresses in the web app.',
    'Customer reviews and star ratings entered by buyers.',
    'Coupons, wish lists, multi-currency and tax.',
    'Order status tracking with courier integration.']),
)

// 16 + glossary
kids.push(H1('16. Approval'),
  table(['Role', 'Name', 'Signature', 'Date'], [
    ['Business owner', '', '', ''],
    ['Product / business analyst', '', '', ''],
    ['Development lead', '', '', ''],
    ['Test lead', '', '', ''],
  ], [2600, 2600, 2600, 1838]),
  gap(),
  H1('Appendix A: Glossary'),
  table(['Term', 'Meaning'], [
    ['API', 'The server program that the web application talks to; it holds the business rules and data.'],
    ['Gift points', 'Loyalty points earned on purchases and redeemed for discounts.'],
    ['JWT', 'A signed token the server gives a user at sign-in, which proves who they are on later requests.'],
    ['MoSCoW', 'Priority scale: Must, Should, Could, Won\'t.'],
    ['Soft delete', 'Hiding a record instead of erasing it, so history stays correct.'],
    ['Swagger UI', 'A web page that lists every API operation and lets staff try them.'],
    ['UPI', 'Unified Payments Interface, an instant bank-transfer payment method.'],
  ], [2200, 7438]),
)

// ---------- build ----------
const doc = new Document({
  creator: 'E-Bookstore project', title: 'E-Bookstore Business Requirements Document',
  styles: {
    default: { document: { run: { font: 'Calibri', size: 21 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 30, bold: true, color: NAVY }, paragraph: { spacing: { before: 360, after: 140 }, outlineLevel: 0, keepNext: true } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, color: '2E75B6' }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1, keepNext: true } },
    ],
  },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [run('E-Bookstore Business Requirements Document', { size: 17, color: '7F7F7F' })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('Draft v1.0  |  Page ', { size: 17, color: '7F7F7F' }), new TextRun({ children: [PageNumber.CURRENT], size: 17, color: '7F7F7F' })] })] }) },
    children: kids,
  }],
})

Packer.toBuffer(doc).then(b => {
  fs.writeFileSync(OUT, b)
  console.log('written', OUT, b.length, 'bytes | FR total', nAll, '| implemented', nImpl, '| partial', nPart, '| not implemented', nNot)
})
