const L = require('./lib.cjs')
const { run, P, H1, H2, bullet, bullets, note, gap, code, pageBreak, table, titlePage, build } = L
const OUT = process.argv[2]

const kids = []
kids.push(...titlePage({
  title: 'HIGH-LEVEL DESIGN (HLD)',
  subtitle: 'Backend API (ebookstore) and Web Application (ebookstore-ui)',
  meta: [
    ['Document version', '1.0 (Draft for review)'],
    ['Date', '12 November 2026'],
    ['Based on', 'E-Bookstore Business Requirements Document v1.0 (EBookstore-BRD.docx)'],
    ['Companion documents', 'Low-Level Design (EBookstore-LLD.docx), Test Cases (EBookstore-TestCases.docx)'],
    ['Prepared by', '[Name to be added]'],
    ['Nature of design', 'As-built design of the working system, with the design gaps against the BRD called out in section 12'],
  ],
}))

kids.push(H1('Contents'))
;['1. Introduction', '2. Architecture Overview', '3. Technology Stack', '4. Logical Architecture and Modules',
  '5. Data Architecture', '6. Security Architecture', '7. Key Runtime Flows', '8. Interface Design',
  '9. Deployment Architecture', '10. Non-Functional Design', '11. Requirements Traceability',
  '12. Design Gaps and Risks', '13. Design Decisions and Assumptions'].forEach(t => kids.push(P(t, { spacing: { after: 40 } })))

// 1
kids.push(H1('1. Introduction'),
  H2('1.1 Purpose'),
  P('This High-Level Design describes how the E-Bookstore platform is built to meet the Business Requirements Document (BRD). It shows the main components, how they connect, where data lives, how security works and how the system is deployed. Detailed class, table and API definitions are in the Low-Level Design.'),
  H2('1.2 Scope'),
  P('Two deliverables are covered:'),
  ...bullets([
    [run('ebookstore', { bold: true }), run(' - a stateless REST API (Spring Boot 3.2.5, Java 17) backed by PostgreSQL.')],
    [run('ebookstore-ui', { bold: true }), run(' - a single-page web application (React 18, Vite) that consumes the API.')],
  ]),
  H2('1.3 Design goals'),
  table(['Goal', 'How the design meets it', 'BRD ref'], [
    ['Complete purchase journey', 'Browse, cart, address, order, payment, confirmation and cancel are exposed as REST resources and mirrored by UI pages.', 'OBJ-1..3'],
    ['Server-enforced rules', 'Business rules (points, 48-hour cancel, ownership) live in the service layer, not the browser.', 'BR-01..15'],
    ['Simple operations', 'Two deployable units and one database. No message queue, no cache, no session store.', 'NFR-9'],
    ['Stateless scaling', 'Authentication is by signed JWT. No server session, so API nodes are interchangeable.', 'NFR-1, NFR-2'],
    ['Clear separation of roles', 'CUSTOMER and ADMIN roles enforced on the server with method-level security.', 'FR-C3'],
  ], [2300, 5938, 1400]),
)

// 2
kids.push(H1('2. Architecture Overview'),
  P('The system is a classic three-tier web application. The browser downloads the React application, which then calls the REST API over HTTP using JSON. The API reads and writes a single PostgreSQL database.'),
  H2('2.1 System context'),
  ...code([
    '  +-----------+    HTTP(S)    +-------------------+   JSON/HTTP   +-----------------+   JDBC   +--------------+',
    '  |  Browser  | ------------> | Web server        | ------------> | ebookstore API  | -------> | PostgreSQL   |',
    '  | (Customer |  static files |  dev:  Vite :3000 |  /api/** is   | Spring Boot     |          | ebookstore_db|',
    '  |  or Admin)|  + /api calls |  prod: nginx      |  proxied      |  :8080          |          |  :5432       |',
    '  +-----------+               +-------------------+  (same origin)+-----------------+          +--------------+',
    '',
    '  Administrators can also call the admin endpoints directly through Swagger UI (/swagger-ui.html).',
  ]),
  gap(),
  note('The API has no CORS configuration. The web server must therefore serve the UI and forward /api to the backend from the same origin. This is a constraint of the current build and is captured in section 9.'),
  H2('2.2 Architectural style'),
  ...bullets([
    'Client-server, with a single-page application as the client.',
    'RESTful JSON API with a uniform response envelope (success, message, data).',
    'Layered backend: controller, service, repository, entity.',
    'Stateless authentication with bearer tokens (JWT).',
    'Relational persistence with an ORM (Spring Data JPA / Hibernate).',
  ]),
)

// 3
kids.push(H1('3. Technology Stack'),
  table(['Layer', 'Technology', 'Role'], [
    ['Browser UI', 'React 18, react-router-dom 6', 'Single-page application and client-side routing'],
    ['UI libraries', 'axios, react-hot-toast', 'HTTP client with interceptors; toast notifications'],
    ['UI build', 'Vite', 'Dev server (port 3000, proxies /api to 8080) and production bundle'],
    ['UI tests', 'Vitest, Testing Library, jsdom, Playwright-core', 'Unit, component and end-to-end tests'],
    ['API framework', 'Spring Boot 3.2.5 on Java 17', 'REST controllers, dependency injection, configuration'],
    ['Security', 'Spring Security, jjwt 0.12.5, BCrypt', 'Filter chain, JWT signing and verification, password hashing'],
    ['Persistence', 'Spring Data JPA, Hibernate', 'ORM mapping and repositories'],
    ['Validation', 'Jakarta Bean Validation', 'Request field checks'],
    ['API documentation', 'springdoc-openapi 2.5.0', 'Swagger UI at /swagger-ui.html, OpenAPI JSON at /api-docs'],
    ['Utilities', 'Lombok', 'Boilerplate reduction for entities and DTOs'],
    ['Database', 'PostgreSQL', 'System of record. Schema generated by Hibernate (ddl-auto=update)'],
    ['API tests', 'PowerShell script against the live API', '52 black-box API tests'],
  ], [1900, 3300, 4438]),
)

// 4
kids.push(H1('4. Logical Architecture and Modules'),
  H2('4.1 Backend layers'),
  ...code([
    '  HTTP request',
    '       |',
    '  [ Security filter chain ]  JwtAuthenticationFilter -> SecurityConfig authorisation rules',
    '       |',
    '  [ Controller layer ]       Auth, Product, Category, Cart, Order, User   (validation, routing, @PreAuthorize)',
    '       |',
    '  [ Service layer ]          AuthService, ProductService, CategoryService, CartService,',
    '       |                     OrderService, PaymentService, AddressService   (business rules, @Transactional)',
    '  [ Repository layer ]       Spring Data JPA interfaces',
    '       |',
    '  [ Entity / PostgreSQL ]    User, Product, Category, Cart, CartItem, Order, OrderItem, Address, Payment',
    '',
    '  Cross-cutting: GlobalExceptionHandler (error mapping), ApiResponse envelope, DataSeeder, OpenApiConfig',
  ]),
  gap(),
  H2('4.2 Backend modules and BRD coverage'),
  table(['Module', 'Responsibility', 'Main classes', 'BRD section'], [
    ['Account and access', 'Registration, login, token issue, role checks, admin seeding', 'AuthController, AuthService, JwtTokenProvider, JwtAuthenticationFilter, SecurityConfig, DataSeeder', '5.1 (FR-A)'],
    ['Catalogue', 'List, filter, search, detail, related books; admin create/update/soft-delete', 'ProductController, ProductService, CategoryController, CategoryService', '5.2, 5.3 (FR-B, FR-C)'],
    ['Cart', 'Per-user server-side cart: add, update, remove, clear', 'CartController, CartService', '5.4 (FR-D)'],
    ['Addresses', 'Customer-scoped address book', 'UserController, AddressService', '5.5 (FR-E)'],
    ['Orders', 'Place order, history, detail, cancel; points earn and redeem; stock decrement', 'OrderController, OrderService', '5.6, 5.8 (FR-F, FR-H)'],
    ['Payment', 'Record a simulated payment, mask card, confirm order', 'UserController (payment endpoints), PaymentService', '5.7 (FR-G)'],
    ['Platform', 'Error mapping, response envelope, OpenAPI', 'GlobalExceptionHandler, ApiResponse, OpenApiConfig', 'NFR'],
  ], [1500, 3000, 3338, 1800]),
  gap(),
  H2('4.3 Frontend structure'),
  ...code([
    '  main.jsx  ->  BrowserRouter  ->  App.jsx  ->  AuthProvider',
    '                                                   |',
    '                  Navbar  |  <Routes> (pages, some wrapped in ProtectedRoute)  |  Footer      + Toaster',
    '                                                   |',
    '                 pages/*  ->  api/services.js  ->  api/axiosClient.js  ->  /api (backend)',
  ]),
  gap(),
  table(['Frontend module', 'Responsibility', 'BRD section'], [
    ['AuthContext / ProtectedRoute', 'Holds the signed-in user, token storage, sign in/up/out, blocks anonymous access', '5.1'],
    ['Home, Catalogue, ProductDetail pages', 'Public browsing, filter, search, detail and related books', '5.2'],
    ['Cart page', 'View and edit cart, order suggestions', '5.4'],
    ['Checkout page', 'Address choice or entry, gift point redemption', '5.5'],
    ['Payment and Confirmation pages', 'Payment method entry, place order then pay, show confirmation', '5.6, 5.7'],
    ['Orders page', 'History, detail, cancel, buy again', '5.6'],
    ['api/services.js', 'One function per API call (24 in total)', 'All'],
    ['api/axiosClient.js', 'Base URL /api, bearer-token injection, 401 handling', '5.1, NFR'],
  ], [3000, 5338, 1300]),
)

// 5
kids.push(H1('5. Data Architecture'),
  P('All business data is held in one PostgreSQL database (ebookstore_db). The schema is generated and updated by Hibernate at start-up. There are nine tables.'),
  H2('5.1 Conceptual data model'),
  ...code([
    '   Category 1 ----< Product                          User 1 ---- 1 Cart 1 ----< CartItem >---- 1 Product',
    '                       |                               |',
    '                       |                               +----< Address',
    '                  OrderItem >---- 1 Order >---- 1 User',
    '                                     |   \\',
    '                                     |    +---- 0..1 Address (shipping)',
    '                                     +---- 0..1 Payment',
    '',
    '   1 ----< = one-to-many      1 ---- 1 = one-to-one      0..1 = optional',
  ]),
  gap(),
  H2('5.2 Entity summary'),
  table(['Table', 'Purpose', 'Key points'], [
    ['users', 'Customers and administrators', 'Unique email, BCrypt password, role CUSTOMER/ADMIN, gift point balance'],
    ['categories', 'Book categories', 'Unique name'],
    ['products', 'Books for sale', 'Unique ISBN, price, stock, rating, active flag (soft delete), category'],
    ['carts / cart_items', 'Server-side shopping cart', 'One cart per user, items removed with the cart'],
    ['addresses', 'Delivery addresses', 'Belong to a user, one may be default'],
    ['orders / order_items', 'Placed orders and their lines', 'Unique order number, status, total, points redeemed, unit price captured per line'],
    ['payments', 'Payment record for an order', 'Method, status, transaction id, masked card, one per order'],
  ], [2000, 3000, 4638]),
  gap(),
  H2('5.3 Data seeding'),
  P('On first start, DataSeeder creates the administrator account (admin@bookstore.com) with an empty cart. If there are no categories it also creates three categories (Technology, Fiction, Science) and seven books. It does nothing on later starts.'),
  H2('5.4 Data handling principles'),
  ...bullets([
    'Prices are stored as DECIMAL(10,2). Order lines copy the unit price at the time of purchase so later price changes do not alter history.',
    'Books are never hard-deleted by the API. Removal sets active = false.',
    'Passwords are stored only as BCrypt hashes. Card numbers are never stored, only the last four digits.',
  ]),
)

// 6
kids.push(H1('6. Security Architecture'),
  H2('6.1 Authentication'),
  ...code([
    '  Client                         API                                   DB',
    '    | POST /api/auth/login  ->    |  AuthenticationManager --------->  | load user, BCrypt compare',
    '    | <- token (HS256 JWT, 24 h)  |',
    '    | GET /api/orders             |',
    '    |   Authorization: Bearer ... |  JwtAuthenticationFilter: verify signature + expiry,',
    '    |                             |  load user, set SecurityContext (authority ROLE_<role>)',
  ]),
  gap(),
  ...bullets([
    'Tokens carry the email as subject and expire after 24 hours. They are signed with a secret from configuration.',
    'The filter ignores an invalid or missing token. The request then proceeds as anonymous and is rejected by the authorisation rules where authentication is needed.',
    'The browser keeps the token in localStorage and adds it to every request through an axios interceptor.',
  ]),
  H2('6.2 Authorisation'),
  table(['Resource', 'Visitor', 'Customer', 'Administrator'], [
    ['/api/auth/**', 'Allowed', 'Allowed', 'Allowed'],
    ['GET /api/products/**, GET /api/categories/**', 'Allowed', 'Allowed', 'Allowed'],
    ['POST/PUT/DELETE products and categories', 'Denied', 'Denied (403)', 'Allowed'],
    ['/api/cart/**, /api/orders/**, /api/users/**', 'Denied', 'Own data only', 'Own data only'],
    ['Swagger UI and API docs', 'Allowed', 'Allowed', 'Allowed'],
  ], [3800, 1700, 2000, 2138]),
  gap(),
  ...bullets([
    'Role checks use @PreAuthorize("hasRole(\'ADMIN\')") with method security enabled.',
    'Data ownership is enforced in services by querying with the signed-in user id (for example find order by id and user id). This is how one customer is prevented from reading another customer\'s orders, addresses and cart.',
    'Known exception: the payment endpoint looks up the order by id only (gap G-3).',
  ]),
  H2('6.3 Other controls'),
  table(['Control', 'Design'], [
    ['Password storage', 'BCrypt hash'],
    ['CSRF', 'Disabled. Acceptable because authentication is by bearer header, not cookie'],
    ['Sessions', 'Stateless'],
    ['Card data', 'Only the last four digits are kept. Full number is never persisted'],
    ['Secrets', 'JWT secret and database password are in application.properties. They must move to environment variables for production (risk R-3)'],
    ['Transport', 'HTTP in development. TLS must be terminated at the web server in production'],
  ], [2300, 7338]),
)

// 7
kids.push(H1('7. Key Runtime Flows'),
  H2('7.1 Purchase flow'),
  ...code([
    '  Customer         UI                      API                          DB',
    '     | add to cart  |  POST /cart/items     |  merge or add line            |',
    '     | checkout     |  GET /users/addresses |                               |',
    '     |              |  (POST address)       |                               |',
    '     | pay          |  POST /orders         |  one transaction:             |',
    '     |              |  {addressId, points}  |   - validate cart, address    |',
    '     |              |                       |   - total, points discount    |',
    '     |              |                       |   - create order + lines      |',
    '     |              |                       |   - reduce stock              |',
    '     |              |                       |   - update gift points        |',
    '     |              |                       |   - clear cart                |',
    '     |              |  POST /users/payment  |  record payment (SUCCESS),    |',
    '     |              |  {orderId, method...} |  mask card, order CONFIRMED   |',
    '     | confirmation |  GET /orders/{id}     |                               |',
  ]),
  gap(),
  note('Order placement and payment are two separate calls. If the second fails the order already exists and the stock and points have already changed (gap G-4).'),
  H2('7.2 Order cancellation flow'),
  ...code([
    '  PUT /api/orders/{id}/cancel',
    '     -> find order for this user            (else "Order not found")',
    '     -> status SHIPPED or DELIVERED?        (reject)',
    '     -> more than 48 h since createdAt?     (reject)',
    '     -> status = CANCELLED, cancelledAt = now',
    '     -> give back redeemed gift points',
    '     -> (stock and earned points are NOT reversed - gap G-2)',
  ]),
  gap(),
  H2('7.3 Gift points rules'),
  table(['Rule', 'Design'], [
    ['Redeem', 'Points used = lower of points requested and balance. Discount = points x $0.01. Total never below $0'],
    ['Earn', 'Whole dollars of the final order total, added to the balance when the order is placed'],
    ['Cancel', 'Redeemed points are returned. Earned points are not removed'],
  ], [1800, 7838]),
)

// 8
kids.push(H1('8. Interface Design'),
  H2('8.1 REST API groups'),
  table(['Group', 'Base path', 'Operations'], [
    ['Authentication', '/api/auth', 'register, login'],
    ['Products', '/api/products', 'list, detail, by category, search, related; admin create/update/delete'],
    ['Categories', '/api/categories', 'list, detail; admin create/update/delete'],
    ['Cart', '/api/cart', 'get, add item, update item, remove item, clear'],
    ['Orders', '/api/orders', 'place, list, detail, cancel'],
    ['User data', '/api/users', 'address CRUD, make payment, get payment for order'],
  ], [1800, 2200, 5638]),
  gap(),
  H2('8.2 Conventions'),
  ...bullets([
    'JSON request and response bodies. Every response is wrapped as { success, message, data }.',
    'Lists are paged using page and size parameters with a sort field (see LLD for defaults).',
    'Authenticated calls send Authorization: Bearer <token>.',
    'Errors use the same envelope. Status codes: 400 for rule and validation failures, 401 for bad credentials, 403 for denied access, 500 for unexpected errors.',
    'Interactive documentation is generated automatically at /swagger-ui.html.',
  ]),
  H2('8.3 External interfaces'),
  P('There are no live external integrations. Payment is simulated inside the API. A real payment gateway, e-mail and shipping providers are future work (BRD section 15).'),
)

// 9
kids.push(H1('9. Deployment Architecture'),
  H2('9.1 Current (development) topology'),
  table(['Node', 'Software', 'Port'], [
    ['Developer machine', 'Vite dev server (ebookstore-ui)', '3000'],
    ['Developer machine', 'Spring Boot jar / mvn spring-boot:run (ebookstore)', '8080'],
    ['Developer machine', 'PostgreSQL, database ebookstore_db', '5432'],
  ], [2800, 5238, 1600]),
  gap(),
  H2('9.2 Recommended production topology'),
  ...code([
    '  Internet --TLS--> [ Reverse proxy / nginx ] --+--> static files (ebookstore-ui build output)',
    '                                                +--> /api/** --> [ ebookstore API x N ] --> [ PostgreSQL ]',
  ]),
  gap(),
  ...bullets([
    'Build the UI with vite build and serve dist/ from the proxy. Forward /api to the API so everything is one origin (no CORS needed).',
    'Run the API as a jar on Java 17. Because it is stateless, run two or more behind the proxy.',
    'Provide the database URL, user, password and JWT secret as environment variables. Do not use the development defaults.',
    'Change ddl-auto from update to validate and manage the schema with a migration tool (Flyway or Liquibase).',
    'Change the seeded admin password and consider disabling seeding outside development.',
    'Turn off show-sql and restrict Swagger UI.',
  ]),
)

// 10
kids.push(H1('10. Non-Functional Design'),
  table(['NFR', 'Target (BRD)', 'Design response', 'State'], [
    ['NFR-1 Performance', 'Pages respond quickly under normal load', 'Paged queries, lazy relations, unique indexes (email, isbn, order number)', 'Met for test volumes; no load test run'],
    ['NFR-2 Scalability', 'Add API nodes without change', 'Stateless JWT, no server session', 'Met by design'],
    ['NFR-3 Availability', 'Single DB and API is acceptable for v1', 'No redundancy in the current build', 'Not addressed'],
    ['NFR-4 Error handling', 'Correct, readable error codes', 'GlobalExceptionHandler and envelope', 'Partial: some 400/403 should be 404/401 (G-7)'],
    ['NFR-5 Security', 'Protect accounts, data and payments', 'JWT, BCrypt, role and ownership checks', 'Partial: G-3 and secret handling'],
    ['NFR-6 Usability', 'Clear feedback to users', 'Toast notifications, loading spinners, alerts', 'Partial: UI-04 missing login error'],
    ['NFR-7 Compatibility', 'Modern browsers', 'React 18 and Vite build output', 'Tested in Chrome'],
    ['NFR-8 Maintainability', 'Understandable, testable code', 'Layered packages, DTOs, automated tests (API 52, UI 138 unit/component, 37 E2E)', 'Met'],
    ['NFR-9 Operability', 'Simple to run', 'Two processes plus one DB; seeding on first start', 'Met'],
    ['NFR-10 Documentation', 'API documented', 'Swagger/OpenAPI generated', 'Met'],
    ['NFR-11 Data integrity', 'No orphan or inconsistent data', 'Transactional order placement, foreign keys, soft delete', 'Partial: ADDR-05, stock can drop to 0 without check'],
  ], [1700, 2100, 3600, 2238], -1, { size: 17 }),
  note('NFR targets are those proposed in the BRD. No load or penetration testing has been performed.'),
)

// 11
kids.push(H1('11. Requirements Traceability'),
  P('The table maps each BRD module to the design elements that realise it and to the test case prefixes in the Test Cases document.'),
  table(['BRD module', 'Backend components', 'Frontend components', 'Test case prefixes'], [
    ['5.1 Account and access (FR-A1..A8)', 'AuthController, AuthService, SecurityConfig, JWT classes, DataSeeder', 'AuthContext, Login, Register, ProtectedRoute, axiosClient', 'TC-AUTH, TC-SEC, TC-UI'],
    ['5.2 Catalogue and search (FR-B1..B8)', 'ProductController/Service, CategoryController/Service', 'Home, Catalogue, ProductDetail, ProductCard', 'TC-CAT, TC-UI'],
    ['5.3 Catalogue management (FR-C1..C4)', '@PreAuthorize on product/category writes', 'None (Swagger only)', 'TC-ADM'],
    ['5.4 Cart (FR-D1..D8)', 'CartController, CartService', 'CartPage, Navbar badge', 'TC-CART, TC-UI'],
    ['5.5 Addresses and checkout (FR-E1..E5)', 'UserController, AddressService', 'CheckoutPage', 'TC-ADDR, TC-UI'],
    ['5.6 Orders (FR-F1..F10)', 'OrderController, OrderService', 'OrdersPage, ConfirmationPage', 'TC-ORD, TC-UI'],
    ['5.7 Payment (FR-G1..G7)', 'PaymentService, UserController', 'PaymentPage', 'TC-PAY, TC-UI'],
    ['5.8 Gift points (FR-H1..H3)', 'OrderService', 'CheckoutPage, OrdersPage', 'TC-PTS'],
  ], [2500, 2700, 2400, 2038], -1, { size: 17 }),
)

// 12
kids.push(H1('12. Design Gaps and Risks'),
  H2('12.1 Gaps against the BRD'),
  table(['ID', 'Gap', 'BRD ref', 'Design impact', 'Suggested design change'], [
    ['G-1', 'No stock check when adding to cart or placing an order', 'FR-D8', 'Over-selling. Stock is clamped at 0', 'Validate quantity against stock in CartService and OrderService, inside the order transaction'],
    ['G-2', 'Cancel does not restore stock or reverse earned points', 'FR-F7', 'Inventory and loyalty drift', 'Add compensating updates in cancelOrder'],
    ['G-3', 'Payment does not check order ownership', 'FR-G5', 'A user could pay another user\'s order', 'Look up the order by id and user id in PaymentService'],
    ['G-4', 'Order is CONFIRMED when placed, before payment', 'FR-G6', 'Unpaid orders look confirmed', 'Start as PENDING, move to CONFIRMED on payment success; or merge place+pay into one transaction'],
    ['G-5', 'Gift point balance is never returned to the UI', 'FR-H3', 'Customer cannot see balance', 'Include giftPoints in the login response and add a profile/balance endpoint'],
    ['G-6', 'No way to set SHIPPED or DELIVERED', 'FR-F10', 'Orders never progress', 'Add an admin endpoint to update order status'],
    ['G-7', 'Some errors return 400 where 404 is correct, 403 where 401 is correct', 'NFR-4', 'Weak error semantics; UI auto-logout never triggers (UI-03)', 'Add NotFound exception and a 401 AuthenticationEntryPoint'],
    ['G-8', 'No administrator screens', 'FR-C4', 'Admin must use Swagger', 'Build an admin area in ebookstore-ui'],
  ], [600, 2600, 800, 2400, 3238], -1, { size: 16 }),
  gap(),
  H2('12.2 Known defects'),
  table(['ID', 'Defect', 'Severity', 'Area'], [
    ['UI-04', 'Login shows no error on a wrong password (401 causes a full reload)', 'High', 'Frontend'],
    ['CART-07', 'Removing a cart line, or setting it to 0, does not delete it', 'High', 'Backend'],
    ['ADDR-05', 'Deleting an address used by an order returns 500', 'Medium', 'Backend'],
    ['UI-03', 'Invalid token gives 403, so the UI does not sign the user out', 'Medium', 'Backend + frontend'],
    ['UI-01', 'Catalogue pagination never moves past page 1', 'Medium', 'Frontend'],
    ['UI-02', 'Opening /payment directly shows a blank page', 'Low', 'Frontend'],
    ['PAY-04', 'Invalid payment method or malformed JSON returns 500', 'Low', 'Backend'],
  ], [1000, 5438, 1300, 1900]),
  note('Root causes and proposed fixes for each defect are in the Low-Level Design, section 10.'),
  H2('12.3 Risks'),
  table(['ID', 'Risk', 'Mitigation'], [
    ['R-1', 'Payments are simulated, so the system cannot take real money', 'Integrate a payment gateway before go-live (FR-G3)'],
    ['R-2', 'Over-selling because stock is not checked', 'Close G-1'],
    ['R-3', 'Secrets and default admin password are in source', 'Environment variables, rotate admin password'],
    ['R-4', 'Hibernate ddl-auto=update used for schema', 'Introduce migrations and use validate'],
    ['R-5', 'No CORS, so UI and API must share an origin', 'Serve through one reverse proxy, or add explicit CORS configuration'],
    ['R-6', 'EbookstoreApplicationTests uses create-drop on the configured database', 'Point tests at a separate test database before running'],
    ['R-7', 'No load or penetration testing performed', 'Plan performance and security testing'],
  ], [800, 4538, 4300]),
)

// 13
kids.push(H1('13. Design Decisions and Assumptions'),
  table(['#', 'Decision', 'Reason'], [
    ['D-1', 'Single deployable API (monolith)', 'Small team and scope. Simplest to build, test and run'],
    ['D-2', 'JWT bearer authentication, stateless', 'Easy horizontal scaling, no server session store'],
    ['D-3', 'Cart stored on the server', 'Cart survives device and session changes (FR-D7)'],
    ['D-4', 'Soft delete for books', 'Keeps order history valid after a book is withdrawn'],
    ['D-5', 'Unit price copied to order lines', 'Order history is not changed by later price edits'],
    ['D-6', 'Payment simulated', 'Capstone scope. Interface is shaped so a gateway can replace it in PaymentService'],
    ['D-7', 'Hibernate generates schema', 'Fast iteration. To be replaced by migrations for production'],
  ], [700, 4000, 4938]),
  gap(),
  P('Assumptions: the HLD describes the system as it is built today. NFR targets are those proposed in the BRD. The author name on the cover page is intentionally left blank for the team to complete.'),
)

build(OUT, {
  title: 'E-Bookstore High-Level Design',
  headerText: 'E-Bookstore High-Level Design',
  footerText: 'Draft v1.0',
  kids,
})
