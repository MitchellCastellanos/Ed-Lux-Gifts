# Customer identity & order history

**Principle: a phone number is a lookup key, never a credential.**

## Two separate layers
1. **Operational grouping (for the owner).** Every order is linked to a `Customer` row keyed by the normalized E.164 phone (`+15145550123`) — `514-555-0123`, `(514) 555-0123`, `5145550123` and `+1 514 555 0123` all resolve to one record. The key is *not* the primary key (UUID), so a phone change keeps relationships. Resolution is a single atomic `INSERT … ON CONFLICT`, so concurrent first orders create exactly one record. An existing record's name/email are **never overwritten** by a checkout; if a new order differs, the order keeps its own snapshot and is flagged "contact differs" for review. The recipient's phone is stored on the order only and never creates or identifies a customer.
2. **Verified access (for the customer).** Access is granted per *order*, from the order's own contact snapshot:
   - **Private link** `/order/<token>`: 192-bit random token, unrelated to the sequential `EDL-001047` number.
   - **Recover one order**: order number + phone → a 6-digit code is emailed to the **email on that order** → opens the private link.
   - **Full history**: phone + email → code emailed only when an order matches **both** → short session cookie → only orders whose snapshot matches the verified email **and** phone (and the current demo/live scope). A shared household phone with two different emails therefore yields two separate, private histories. Customer-record edits by the admin do not change who can see an order.

## Verification security
Codes are 6 digits, HMAC-SHA256 hashed with `APP_SECRET`, valid 10 min, single-use (atomic consume), max 5 wrong attempts, 60 s resend cooldown, per-IP and per-identity throttles. Responses are generic whether or not anything matched; a code is only created/sent on a real match. Sessions: random 256-bit token (only its hash is stored), `httpOnly`, `sameSite=lax`, `secure` in production, 2 h, explicit logout. Private pages send `Cache-Control: private, no-store` and `noindex`.

**No email provider configured ⇒ full-history and order-recovery fail safely** (contact-support message). Private tracking links keep working. There is no phone-only fallback and no SMS.

## Admin tools
Search by formatted/normalized/partial phone, name, email or order number across all dates; customer panel with call/copy actions, active/previous/cancelled orders and notes; edit name/email/phone — a phone change that collides with another record is **refused (never merged)** and links to the other record; move a mis-associated order to the right phone's record; **anonymize** a customer (Law 25 erasure request: personal data removed from the customer and their orders, amounts kept for accounting; refused while orders are in progress).

## Law 25 / privacy notes (not legal advice)
Data minimised (no card data, no passwords); retention is configurable (default 84 months, purged daily for completed orders); a privacy page exists but **publishing it does not make the business compliant**. Before launch the owner should: name a person responsible for personal information, confirm retention with an accountant, review the privacy policy/terms with counsel, confirm hosting regions, and set up a process for access/correction/erasure requests and incident response.
