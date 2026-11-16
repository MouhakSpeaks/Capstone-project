# E-Bookstore UI — React + Vite

Frontend for the E-Bookstore Capstone project, built with React 18 and Vite.

## Prerequisites

- Node.js 18+
- The Spring Boot backend running on `http://localhost:8080`

## Install & Run

```bash
cd ebookstore-ui
npm install
npm run dev
```

Opens at **http://localhost:3000**

The Vite dev server proxies all `/api/*` requests to `http://localhost:8080` automatically.

## Build for Production

```bash
npm run build       # outputs to dist/
npm run preview     # serve the build locally
```

## Pages & Routes

| Route | Page | Description |
|---|---|---|
| `/` | Home | Hero, category chips, top-rated books, promo banner |
| `/catalogue` | Catalogue | Category sidebar, search, paginated product grid |
| `/products/:id` | Product Detail | Full detail, delivery date, qty selector, related books |
| `/cart` | Cart | Basket items, qty update, remove, order summary, recommendations |
| `/checkout` | Checkout | Address select/add, gift points redemption |
| `/payment` | Payment | Credit/Debit/UPI/Net Banking/Gift Points form |
| `/confirmation/:orderId` | Confirmation | Success message, items, address, cancel note |
| `/orders` | Order History | Paginated orders, expand for detail, Buy Again, Cancel |
| `/login` | Login | JWT sign-in |
| `/register` | Register | Create account |

## Screens mapped to Capstone slides

| Slide | Feature | Route |
|---|---|---|
| Slide 5 — Landing | Hero + featured books | `/` |
| Slide 6 — Catalogue | Category / brand / search | `/catalogue` |
| Slide 6 — Related products | Related books section | `/products/:id` |
| Slide 7 — Shopping Cart | Basket + recommended from history | `/cart` |
| Slide 8 — Address | Delivery address selection | `/checkout` |
| Slide 8 — Gift Points | Points redemption input | `/checkout` |
| Slide 9 — Payment | All payment methods | `/payment` |
| Slide 10 — Confirmation | Purchase complete message | `/confirmation/:id` |
| Slide 3 — Order History | Buy Again + Cancel within 48h | `/orders` |

## Project Structure

```
src/
├── api/
│   ├── axiosClient.js     JWT interceptor + auto-logout
│   └── services.js        All API calls (auth, products, cart, orders, payment)
├── components/
│   ├── Navbar.jsx/css     Sticky nav with search, cart badge, user menu
│   ├── Footer.jsx/css     Links footer
│   ├── ProductCard.jsx/css Book card with Add to Cart
│   └── Common.jsx         Spinner, StarRating, Alert, Pagination
├── context/
│   └── AuthContext.jsx    Global auth state + JWT storage
├── pages/
│   ├── HomePage.jsx/css
│   ├── LoginPage.jsx
│   ├── RegisterPage.jsx
│   ├── AuthPages.css
│   ├── CataloguePage.jsx/css
│   ├── ProductDetailPage.jsx/css
│   ├── CartPage.jsx/css
│   ├── CheckoutPage.jsx/css
│   ├── PaymentPage.jsx/css
│   ├── ConfirmationPage.jsx/css
│   └── OrdersPage.jsx/css
├── App.jsx                Router + protected routes
├── main.jsx               Entry point
└── index.css              Global styles + design tokens
```
