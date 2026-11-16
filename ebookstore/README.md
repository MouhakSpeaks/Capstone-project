# E-Bookstore Backend — Spring Boot

A production-quality REST API backend for the E-Bookstore Capstone project.

## Technology Stack

| Layer | Technology |
|---|---|
| Language | Java 17 |
| Framework | Spring Boot 3.2.5 |
| Security | Spring Security + JWT (jjwt 0.12.5) |
| Database | PostgreSQL |
| ORM | Spring Data JPA / Hibernate |
| Documentation | SpringDoc OpenAPI 3 (Swagger UI) |
| Build | Maven |

## Prerequisites

- Java 17+
- Maven 3.8+
- PostgreSQL 14+ running locally

## Database Setup

```sql
CREATE DATABASE ebookstore_db;
```

Update `src/main/resources/application.properties` with your PostgreSQL credentials if needed.

## Build & Run

```bash
# From the ebookstore/ directory
./mvnw clean install
./mvnw spring-boot:run
```

Windows:
```bash
mvnw.cmd clean install
mvnw.cmd spring-boot:run
```

The server starts on **http://localhost:8080**

## Swagger / OpenAPI UI

Open **http://localhost:8080/swagger-ui.html** in a browser to explore and test all endpoints.

Raw OpenAPI JSON: http://localhost:8080/api-docs

## API Endpoints

### Authentication (public)
| Method | URL | Description |
|---|---|---|
| POST | `/api/auth/register` | Register a new customer |
| POST | `/api/auth/login` | Login → returns JWT token |

### Products (public)
| Method | URL | Description |
|---|---|---|
| GET | `/api/products` | All active products (paginated) |
| GET | `/api/products/{id}` | Product detail |
| GET | `/api/products/category/{categoryId}` | Products by category |
| GET | `/api/products/search?keyword=` | Full-text search |
| GET | `/api/products/{id}/related` | Related products |
| POST | `/api/products` | Create product (ADMIN) |
| PUT | `/api/products/{id}` | Update product (ADMIN) |
| DELETE | `/api/products/{id}` | Soft-delete product (ADMIN) |

### Categories (public)
| Method | URL | Description |
|---|---|---|
| GET | `/api/categories` | All categories |
| GET | `/api/categories/{id}` | Category by ID |
| POST | `/api/categories` | Create category (ADMIN) |
| PUT | `/api/categories/{id}` | Update category (ADMIN) |
| DELETE | `/api/categories/{id}` | Delete category (ADMIN) |

### Shopping Cart (auth required)
| Method | URL | Description |
|---|---|---|
| GET | `/api/cart` | View cart |
| POST | `/api/cart/items` | Add item to cart |
| PUT | `/api/cart/items/{cartItemId}?quantity=N` | Update item quantity |
| DELETE | `/api/cart/items/{cartItemId}` | Remove item |
| DELETE | `/api/cart` | Clear cart |

### Orders (auth required)
| Method | URL | Description |
|---|---|---|
| POST | `/api/orders` | Place order from cart |
| GET | `/api/orders` | Order history (Buy Again) |
| GET | `/api/orders/{orderId}` | Order detail |
| PUT | `/api/orders/{orderId}/cancel` | Cancel within 48h |

### User / Addresses / Payment (auth required)
| Method | URL | Description |
|---|---|---|
| GET | `/api/users/addresses` | Get delivery addresses |
| POST | `/api/users/addresses` | Add address |
| PUT | `/api/users/addresses/{id}` | Update address |
| DELETE | `/api/users/addresses/{id}` | Delete address |
| POST | `/api/users/payment` | Process payment |
| GET | `/api/users/payment/order/{orderId}` | Payment details |

## Authentication

After login, include the JWT token in all protected requests:

```
Authorization: Bearer <token>
```

## Project Structure

```
src/main/java/com/capstone/ebookstore/
├── EbookstoreApplication.java
├── config/
│   ├── OpenApiConfig.java
│   └── SecurityConfig.java
├── controller/
│   ├── AuthController.java
│   ├── CartController.java
│   ├── CategoryController.java
│   ├── OrderController.java
│   ├── ProductController.java
│   └── UserController.java
├── dto/              (Request/Response DTOs)
├── entity/           (JPA entities)
├── exception/
│   └── GlobalExceptionHandler.java
├── repository/       (Spring Data JPA repos)
├── security/
│   ├── JwtAuthenticationFilter.java
│   ├── JwtTokenProvider.java
│   └── UserDetailsServiceImpl.java
└── service/          (Business logic)
```

## Git Workflow

```bash
git init
git checkout -b feature/spring-boot-api
git add .
git commit -m "Implement Spring Boot API for e-commerce bookstore"
git push origin feature/spring-boot-api
```
