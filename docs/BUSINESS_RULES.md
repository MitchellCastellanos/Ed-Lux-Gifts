# Business rules

## Inventory lifecycle (exact)
Per component: `stockOnHand` (physical), `stockReserved` (promised to open orders), `available = onHand − reserved`.

| Event | onHand | reserved | `Order.inventoryState` |
|---|---|---|---|
| Order created (any payment method) | – | **+qty** (atomic, guarded) | `RESERVED` |
| Order **delivered** | **−qty** | **−qty** | `CONSUMED` |
| Order **cancelled** (before delivery) | – | −qty | `RELEASED` |
| Interac unpaid past deadline (auto) | – | −qty | `RELEASED` (+ payment `EXPIRED`, fulfillment `CANCELLED`) |
| Admin **reactivates** an expired order | – | +qty (fails if sold meanwhile) | `RESERVED` |
| Admin stock adjustment | set/± | must stay ≥ reserved and ≥ 0 | – |

The `OrderStockLine` rows record exactly what was reserved, so consuming/releasing can never double-count and is unaffected by later recipe or price edits. Each transition runs under a row lock; repeated clicks are rejected by the state machine. Stock is consumed at delivery (not preparation) to keep one simple rule — physical usage before delivery is reflected by the owner's stock adjustments if desired.

*Expiry*: only `INTERAC` orders in `AWAITING_INTERAC` expire, after `interacDeadlineHours` (default 48 h). Payment-on-delivery orders **never** expire. Expired orders stay visible (filter "Annulées") with a "Réactiver (virement tardif)" action.

## Pricing
- Ready-made basket: owner-set selling price, independent of component prices (never auto-recalculated).
- Custom basket: `base price + Σ(item price × qty) + paid presentation options`. Options listed in the base's *included options* are free and never charged twice.
- **Capacity**: each base has capacity points, each item a capacity cost; adding beyond capacity is blocked in the UI and rejected by the server.
- Delivery fee: per zone, optional free-delivery threshold; the fee charged is **frozen on the order**.
- Customers must re-confirm if prices/stock changed since they added items (`seenUnitCents`, `expectedTotalCents`).

## Taxes
Configurable: none / GST+QST / custom rate; applied on top of displayed prices, optionally on delivery; each tax rounded separately; itemised before submission and stored on the order. **The business is not assumed to be registered.** Launch is blocked until the owner ticks "Taxes confirmed" — the owner must confirm obligations with an accountant.

## Schedule (America/Toronto)
Defaults: cutoff Friday 13:00; delivery Saturday & Sunday; 3 weeks ahead; 12 orders/day. A delivery date's cutoff is the latest cutoff day/time on or before that date, so after Friday 13:00 the current weekend disappears and the next one stays open. Also configurable: closed dates (admin can close a single weekend), global pause (existing orders and history stay accessible) and per-day capacity (enforced under an advisory lock). All rules are enforced on the server.

## Delivery zones
Zones own 3-character postal prefixes (FSA). A prefix belongs to at most one zone; conflicts are rejected with the owning zone named. Unsupported or disabled areas are rejected at checkout. Seeded zones are **illustrative** (`verified = false`) and launch is blocked until each active zone is verified.

## Payments
- **Interac e-Transfer**: order first, then transfer. Confirmation shows amount, Interac email and order number as reference with copy buttons, the deadline, and "payment not verified". The owner marks paid manually; marking paid also confirms the order. Unpaid Interac orders cannot be prepared or delivered.
- **Payment on delivery**: cash and/or Interac at delivery (each toggleable). The owner records collection with "Livrée et payée".
- Either method can be disabled; a single remaining method simplifies checkout. In live mode, Interac orders are refused while the Interac address is fictional (`@example.*`).

## Order statuses
Payment: `AWAITING_INTERAC · DUE_ON_DELIVERY · PAID · EXPIRED · REFUNDED`. Fulfillment: `NEW → CONFIRMED → PREPARING → READY → DELIVERED`, or `CANCELLED` from any non-delivered state. Transitions are validated server-side (`allowedActions`) and each is logged in `OrderEvent`. Internal notes are never sent to customers.

## Demo vs live
`store.mode = demo | live`. Demo orders/customers carry `isDemo = true`, use `DEMO-` order numbers, and customers are unique per `(phone, isDemo)` so demo and real identities can never collide. Customer history is scoped to the current mode. Going live requires: verified business info, a real Interac address (if enabled), verified zones, confirmed taxes, working email and a completed test email. Cleanup tools remove only untouched demo data; anything the owner edited is converted to a real record (`isDemo = false`) and preserved.
