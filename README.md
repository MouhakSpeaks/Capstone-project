# E-Bookstore Capstone Project

An end-to-end full-stack e-commerce bookstore solution comprising a Spring Boot REST API backend, a modern React (Vite) frontend, an automated Playwright test suite, and architectural/design documentation.

---

## 📁 Repository Structure

```
project1/
├── ebookstore/                # Backend — Java 17, Spring Boot 3, Spring Security, JWT, PostgreSQL
├── ebookstore-ui/             # Frontend — React 18, Vite, React Router, Axios
├── ebookstore-automation/     # Automated E2E & Integration Tests — Playwright Test Suite
├── docs/                      # Capstone Architecture & Design Documentation (BRD, HLD, LLD, Test Cases)
├── capstone_instructions.pptx # Project Requirements & Specifications Presentation
└── README.md                  # Root documentation
```

---

## 🛠️ Modules Overview

### 1. Backend (`/ebookstore`)
- **Framework:** Spring Boot 3.2.5, Java 17, Spring Data JPA / Hibernate
- **Database:** PostgreSQL
- **Security:** Spring Security + Stateless JWT Authentication & Role-Based Access Control (RBAC)
- **API Docs:** SpringDoc OpenAPI 3 / Swagger UI (`http://localhost:8080/swagger-ui.html`)
- **Key Modules:** User Auth, Product Catalog, Category Management, Shopping Cart, Orders, User Addresses & Payment

### 2. Frontend (`/ebookstore-ui`)
- **Framework:** React 18, Vite, React Router v6
- **State & Networking:** Context API + Axios with JWT interceptors
- **Features:**
  - Landing & Featured Books
  - Filterable & Searchable Catalogue
  - Detailed Product Pages with Delivery Estimates & Related Books
  - Cart Management & Personalized Recommendations
  - Checkout with Multi-address Management & Gift Points Redemption
  - Multi-method Payment (Credit/Debit, UPI, Net Banking, Gift Points)
  - Order Confirmation & 48-hour Order Cancellation / Buy Again History

### 3. Test Automation (`/ebookstore-automation`)
- **Framework:** Playwright (Chromium, Firefox, WebKit, Mobile Viewports)
- **Design Pattern:** Page Object Model (POM)
- **Coverage:** End-to-end shopping flow, authentication, cart operations, checkout, payment, cancellation, and API validations.

### 4. Documentation (`/docs`)
- **BRD:** Business Requirements Document (`EBookstore-BRD.docx`)
- **HLD:** High-Level Design Document (`EBookstore-HLD.docx`)
- **LLD:** Low-Level Design Document (`EBookstore-LLD.docx`)
- **Test Cases:** Traceability matrix and test scenarios (`EBookstore-TestCases.docx`)

---

## 🚀 Getting Started

### Prerequisites
- **Java:** JDK 17+
- **Node.js:** v18+ and npm
- **Database:** PostgreSQL 14+
- **Git**

---

### Step 1: Start Backend

```bash
cd ebookstore
# Ensure PostgreSQL database 'ebookstore_db' is created and configured in application.properties
./mvnw clean install
./mvnw spring-boot:run
```
Backend runs at: `http://localhost:8080` (Swagger UI at: `http://localhost:8080/swagger-ui.html`)

---

### Step 2: Start Frontend

```bash
cd ebookstore-ui
npm install
npm run dev
```
Frontend runs at: `http://localhost:3000`

---

### Step 3: Run Automation Tests

```bash
cd ebookstore-automation
npm install
npx playwright test
```
View HTML report: `npx playwright show-report`

---

## 📄 License
This project is developed as part of the AI Capstone Project.
