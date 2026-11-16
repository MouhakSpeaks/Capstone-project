# Supplemental API Test Report

- Run at: 2026-11-12 16:23:37
- Target: http://localhost:8080
- Total: **31**, Passed: **16**, Failed: **15**

| ID | Test | Result | Details |
|----|------|--------|---------|
| SUP-01 | Product price 0 rejected (BR price > 0) | PASS | status=400 |
| SUP-02 | Product price negative rejected | PASS | status=400 |
| SUP-03 | Duplicate ISBN rejected with a client error (not 500) | FAIL | status=500 |
| SUP-04 | Password minimum length enforced | FAIL | status=201 (1-character password accepted if 200/201) |
| SUP-05 | Paging honours size=3 | PASS | items=3, totalPages=5 |
| SUP-06 | Search is case-insensitive (COSMOS) | PASS | hits=1 |
| SUP-07 | Search without keyword is a client error | FAIL | status=500 |
| SUP-08 | Tampered token is denied | PASS | status=403 |
| SUP-09 | Customer B cannot update customer A's address | PASS | status=400 |
| SUP-10 | Customer B cannot delete customer A's address | PASS | status=400 |
| SUP-11 | Customer B's cart does not contain customer A's items | PASS | B items=0 |
| SUP-12 | Customer cannot delete a product | PASS | status=403 |
| SUP-13 | Swagger UI reachable | PASS | status=200 |
| SUP-14 | Order total $20.00 earns 20 points (verified via next redeem cap) | PASS | order=ORD-C42BE3BD, total=20.00 |
| SUP-15 | Redeem capped at balance (requested 1000, balance 20) | PASS | redeemed=20, total=19.80 (expected 19.80) |
| SUP-16 | Total = price - redeemed x 0.01 | PASS | total=19.80 |
| SUP-17 | Total never below $0 (price 0.10, redeem 20 points = $0.20) | PASS | total=0 |
| SUP-18 | Negative pointsToRedeem rejected or ignored (total stays $20.00) | FAIL | status=201, total=20.50, pointsRedeemed=-50 |
| SUP-19 | Order with unknown address rejected | PASS | status=400, msg=Address not found |
| SUP-20 | Cancel an order that is already CANCELLED is rejected | FAIL | first=200, second=200 |
| SUP-21 | Customer B cannot cancel customer A's order | PASS | status=400 |
| SUP-22 | GAP G-1 / FR-D8: adding more than stock (10 vs 3) is rejected | FAIL | status=200, cart qty=10 |
| SUP-23 | GAP G-1 / FR-D8: order of 10 when stock is 3 is rejected | FAIL | status=201, stock after=0 (expected 3) |
| SUP-24 | GAP G-2 / FR-F7: cancel returns books to stock | FAIL | stock: start 10, after order 8, after cancel 8 |
| SUP-25 | GAP G-3 / FR-G5: customer B cannot pay customer A's order | FAIL | status=200 |
| SUP-26 | GAP G-4 / FR-G6: new unpaid order is not CONFIRMED | FAIL | status right after placement=CONFIRMED |
| SUP-27 | GAP G-5 / FR-H3: login response exposes the gift point balance | FAIL | fields=token,email,firstName,lastName,role |
| SUP-28 | GAP G-6 / FR-F10: admin can set order status SHIPPED | FAIL | status=500 |
| SUP-29 | GAP G-7 / NFR-4: unknown product returns 404 | FAIL | status=400 |
| SUP-30 | GAP G-7 / NFR-4: missing token returns 401 | FAIL | status=403 |
| SUP-31 | Cancelling twice does not credit redeemed points twice (expected balance 39, not 59) | FAIL | balance seen by probe order=59 |
