# E2E results

Run against http://localhost:3100 on 2026-11-27T01:14:48.963Z

| Step | Result |
|---|---|
| security: admin is protected (page redirects, API returns 401) | PASS |
| 1. ready-made basket ordered with Interac (+ #11 phone format A, #18 recipient phone) | PASS |
| 2+4. custom basket + ready-made together, payment on delivery (cash); phone format B resolves to same customer | PASS |
| 3. payment-on-delivery order shows amount due (verified above) & Interac custom order works | PASS |
| 14. track an order with its secure private link (no cookies, new browser context) | PASS |
| 12+13. admin phone search finds both orders (different formats) and opens the customer history | PASS |
| 11. both orders attached to ONE customer record (no duplicate) | PASS |
| 18. recipient phone does not create or identify a purchaser customer | PASS |
| 15. recover an order with the verification flow (order number + phone → code sent to order email) | PASS |
| 16. passwordless history shows ONLY orders matching verified email + phone | PASS |
| 17. a visitor who only knows a phone number gets nothing (no code, no data, same generic message) | PASS |
| 5. manage an order from creation to delivery in the admin UI | PASS |
| 6. edit a product price and update inventory without a technical form | PASS |
| basket recipe editor (visual, no IDs) renders and saves | PASS |
| 7. changing a delivery fee is reflected at checkout | PASS |
| delivery zone prefix conflicts are rejected | PASS |
| 8. close the current weekend without closing the store | PASS |
| 9. edit, unpublish and republish the homepage campaign | PASS |
| 10. create a new collection in the admin and see it on the storefront (no code change) | PASS |
| admin: customer lookup & mobile admin screenshots | PASS |
| security: private pages are not indexable/cacheable; admin pages noindex | PASS |
