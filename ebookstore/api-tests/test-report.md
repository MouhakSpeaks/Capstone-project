# Ebookstore API Test Report

- Run at: 2026-11-03 19:44:37
- Target: http://localhost:8080
- Total: **52**, Passed: **49**, Failed: **3**

| ID | Test | Result | Details |
|----|------|--------|---------|
| CAT-01 | GET /api/categories returns seeded categories | PASS | status=200, count=5 |
| CAT-02 | GET /api/categories/{id} | PASS | status=200, name=Technology |
| PRD-01 | GET /api/products paginated list | PASS | status=200, total=7 |
| PRD-02 | GET /api/products/{id} | PASS | status=200, title=Cosmos |
| PRD-03 | GET /api/products/{id} unknown id is rejected | PASS | status=400, msg=Product not found: 999999 |
| PRD-04 | Search by keyword (title) | PASS | status=200, hits=1 |
| PRD-05 | Search by author | PASS | status=200, hits=1 |
| PRD-06 | Search with no match returns empty page | PASS | status=200, hits=0 |
| PRD-07 | Products by category | PASS | status=200, hits=3 |
| PRD-08 | Related products | PASS | status=200, related=1 |
| AUTH-01 | Register new customer | PASS | status=201, role=CUSTOMER |
| AUTH-02 | Register duplicate email is rejected | PASS | status=400, msg=Email already in use: tester20261103194435@example.com |
| AUTH-03 | Register with invalid email / blank fields fails validation | PASS | status=400, msg=Validation failed |
| AUTH-04 | Login with valid credentials returns JWT | PASS | status=200, role=CUSTOMER |
| AUTH-05 | Login with wrong password returns 401 | PASS | status=401 |
| AUTH-06 | Login with malformed email fails validation | PASS | status=400 |
| AUTH-07 | Seeded admin can login | PASS | status=200, role=ADMIN |
| SEC-01 | Cart without token is denied | PASS | status=403 |
| SEC-02 | Orders with invalid token are denied | PASS | status=403 |
| SEC-03 | Customer cannot create product (ADMIN only) | PASS | status=403 |
| SEC-04 | Customer cannot create category (ADMIN only) | PASS | status=403 |
| ADM-01 | Admin creates category | PASS | status=201, id=8 |
| ADM-02 | Admin updates category | PASS | status=200, name=TestCat20261103194435-upd |
| ADM-03 | Admin creates product | PASS | status=201, id=10 |
| ADM-04 | Admin updates product price | PASS | status=200, price=24.99 |
| ADM-05 | Product validation: missing title/price rejected | PASS | status=400 |
| ADM-06 | Admin soft-deletes product; it disappears from catalogue | PASS | delete=200, searchHits=0 |
| ADM-07 | Admin deletes category | PASS | status=200 |
| CART-01 | New customer cart is empty | PASS | status=200, items=0 |
| CART-02 | Add product to cart | PASS | status=200, items=1 |
| CART-03 | Adding same product again merges quantity | PASS | qty=2 |
| CART-04 | Update cart item quantity | PASS | qty=3 |
| CART-05 | Quantity < 1 rejected by validation | PASS | status=400 |
| CART-06 | Adding unknown product rejected | PASS | status=400, msg=Product not found: 999999 |
| CART-07 | Add second product and remove it | FAIL | afterAdd=2, deleteResponseItems=2, refetchedItems=2 |
| ADDR-01 | Add address | PASS | status=200, id=5 |
| ADDR-02 | List addresses | PASS | count=1 |
| ADDR-03 | Update address | PASS | city=Mumbai |
| ADDR-04 | Address validation: blank fields rejected | PASS | status=400 |
| ORD-01 | Place order from cart (stock decreases, cart cleared) | PASS | status=201, order=ORD-7EFE356B, total=66.96 (cart total 66.96), stock 32->29, cartItems=0 |
| ORD-02 | Place order with empty cart rejected | PASS | status=400, msg=Cart is empty |
| ORD-03 | Order history lists the order | PASS | total=1 |
| ORD-04 | Get order by id | PASS | order=ORD-7EFE356B |
| ORD-05 | Another user cannot read this order | PASS | status=400, msg=Order not found: 7 |
| ORD-06 | Redeem gift points reduces total | PASS | status=201, total=16.33 (expected 16.33), pointsRedeemed=66 |
| PAY-01 | Process credit-card payment (card masked) | PASS | status=200, pay=SUCCESS, card=**** **** **** 1111, txn=TXN-0A9D65E2-A17 |
| PAY-02 | Get payment by order | PASS | amount=66.96 |
| PAY-03 | Payment for unknown order rejected | PASS | status=400 |
| PAY-04 | Payment with invalid method rejected | FAIL | status=500 |
| ORD-07 | Cancel order within 48h | PASS | status=200, orderStatus=CANCELLED |
| PAY-05 | Cannot pay for a cancelled order | PASS | status=400, msg=Cannot pay for a cancelled order |
| ADDR-05 | Delete address | FAIL | status=500, msg=An unexpected error occurred: could not execute statement [ERROR: update or delete on table "addresses" violates foreign key constraint "fkmk6q95x8ffidq82wlqjaq7sqc" on table "orders"
  Detail: Key (id)=(5) is still referenced from table "orders".] [delete from addresses where id=?]; SQL [delete from addresses where id=?]; constraint [fkmk6q95x8ffidq82wlqjaq7sqc] |

