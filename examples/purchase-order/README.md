> **A3 reference example only — this is not the team-selected A3 application.** This copied Lab prototype is included as a separate reference. It sends read-only OData `GET` requests directly from the browser; it is not a deployed MCP integration.

# Purchase Order Viewer (Lab 02)

A single-file, read-only web page that retrieves **purchase orders** from the SAP S/4HANA Cloud
OData V4 API `API_PURCHASEORDER_2`, using the SAP Business Accelerator Hub sandbox as the default
service root. It shows the order header lines in a table, lets you filter and page through them,
and opens the line items of any order on demand.

It is a front-end exercise only: no backend, no build step, no packages, no frameworks, no login
screen and no write operations. Nothing is ever sent to the service except `GET` requests, and
nothing you type is uploaded anywhere except to the service root you select.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The whole application: markup, styling and script in one file. |
| `CE_PURCHASEORDER_0001.edmx` | The service metadata. **Read-only reference** — the app never loads or changes it. |
| `README.md` | This document. |

## Opening the app

The page is standalone: no backend, no build, no packages and no external files. Open `index.html`
directly (double-click, or a browser's `File → Open File`), or serve the folder from any simple
static server — for example `python3 -m http.server 6282` in this folder, then open
`http://127.0.0.1:6282/index.html`. That served configuration is the one that was actually exercised
in a browser (see the verification notes below).

Direct `file://` operation is expected to work, because the sandbox replies with
`Access-Control-Allow-Origin: *` and its preflight accepts an `Origin: null` request, but a direct
file-origin end-to-end run was **not** verified by the agent writing this page — treat it as your
own acceptance check. If a browser refuses the request from `file://`, the local static server above
is the fallback, and it changes nothing about how the app works.

An internet connection is required for retrieval. The page has no bundled sample data and no demo
fallback: if the service cannot be reached, it says so rather than inventing rows.

## Getting a sandbox API key

Every request must carry a valid SAP Business Accelerator Hub sandbox key in an `APIKey` header.

1. Sign in at the SAP Business Accelerator Hub (`api.sap.com`).
2. Search for the API `API_PURCHASEORDER_2` (SAP S/4HANA Cloud) and open the **sandbox** package
   for it. Sandbox APIs require you to be signed in and may require accepting the terms once.
3. Use the **Show API Key** / copy-key control on the API page to copy the sandbox key.

The sandbox is shared and rate-limited, and its key is validated by the gateway in front of the
API, not by the API itself. Keep your key to yourself; it identifies your account.

## Using the app

1. Paste the key into **SAP API Hub sandbox key** and press **Load purchase orders**. The key is
   held in memory for the lifetime of the page only.
2. **Filters** (optional): **Supplier ID** matches exactly, and **PO date from / to** is an
   inclusive range on the purchase order date. Both date ends are optional. Press **Apply filters**
   to send them to the service as one OData `$filter` expression, or **Clear filters** to remove
   them and reload.
3. **Rows per page** (10/20/50/100) and **Previous** / **Next** page through the result set. A page
   is never the whole data set; the line under the heading states which page you are on, how many
   rows it contains, and — when the service reports it — how many rows match the query in total.
   Where the service does not report a count, the app shows page navigation only and does not
   pretend to know the total.
4. **Click or keyboard-activate a PO number** to open a drawer with that order's line items
   (item number, description, quantity, unit, net amount and currency). Close it with the **Close**
   button or the `Escape` key; focus returns to the row you came from. Item lists are cached for
   the life of the current connection only, so re-opening an order does not re-request it.
5. **Clear connection** erases the key, all cached data and the rendered rows, and resets the table
   and paging to their starting state. The filter fields keep whatever text you typed but nothing is
   sent to the service until you connect and apply them again.

## How the numbers are shown

**Total value** is computed by this page, not returned by the API: it is the exact sum of the line
items' net order values (`NetAmount`) in the purchase order's own currency. The API has no header
total field. In particular:

- `DownPaymentAmount` is **not** used, and unit prices (`NetPriceAmount`) are never summed.
- The sum is exact decimal arithmetic on the digits the app receives: each amount is scaled to an
  integer before adding, so `100.00 + 20.50` is `120.50` and `9.999` keeps three decimal places with
  no binary-floating-point rounding. That is exactness for the received decimal representation, not
  arbitrary precision for every numeric JSON input — a decimal delivered as a JSON number has already
  passed through `JSON.parse`, and this page does not try to recover digits lost there. For this
  service `NetAmount` is declared `Edm.Decimal` with 13 digits of precision and variable scale, so
  values are expected to sit comfortably inside what a JavaScript number represents losslessly; a
  decimal delivered as a JSON string is used digit for digit.
- The cell reads **Pending** when the item list is not loaded yet, **Loading…** while it is being
  fetched, and **Unavailable** if any item amount is missing or non-numeric, if items use mixed
  currencies, or if any item has a blank or missing currency. **Partial** means only part of the
  order's items were retrieved — the service returned a nested next link or the item list passed the
  safety cap — so no total is claimed. A number is only ever displayed when the sum is complete.
- An item with no currency fails the whole order closed, even when the header has a currency: the
  total is refused and the reason is shown instead of labelling an unknown amount with a currency.
  A missing item currency is never inferred or assumed from the purchase order.
- Amounts are labelled with the document currency returned by the service. Currencies are never
  added together.

**Status code** is the raw `PurchasingProcessingStatus` value returned by the service. The service
metadata contains no code-to-label mapping, so codes such as `02` are shown untranslated instead of
being guessed. The footnote under the table says so on screen.

Other display rules: identifiers such as `4500000001` and item numbers such as `00010` keep their
exact form including leading zeros, dates are rendered as calendar dates (`05 Mar 2019`) with no
time-zone shifting, and any text returned by the service is rendered as text, never as HTML.

## What has been verified

**Checked locally, without a key** (no network calls in these harnesses):

- The inline script parses (`node --check`).
- An 85-check harness over the pure helpers and the source: element-ID coverage, OData string-literal
  escaping (`O'Hare` → `'O''Hare'`), filter building, calendar-date validation, list and item URL
  construction, the next-link origin guard, exact decimal summation and item summarisation — plus
  focused regressions for the currency rule: one known currency with one missing, all missing, a
  whitespace-only currency, all the same currency, mixed currencies, and a confirmed empty list.
- A 67-check integration run in headless Chrome with a stubbed `window.fetch`, driving the real page
  through: the expanded-items path, filters (including escaping, inverted ranges and invalid dates),
  `$top`/`$skip` paging, the fallback when `$expand` is refused, lazy item loading, item failures,
  HTTP 401/500 and malformed payloads, `Clear connection`, and the accessibility surface.

**Observed live in a browser.** A Chrome tab served *only* this `index.html` (from
`http://127.0.0.1:6282/index.html`) and was driven with a valid runtime key — no proxy, no middle
tier; the `GET` requests went straight from the browser to the configured SAP API Hub sandbox:

- The initial load returned 20 purchase orders and reported **207,685** matching rows at that time.
  **Next** showed page 2 starting at `4500000021`, and **Previous** returned to page 1.
- The supplier exact filter `USSU-VSF01` reported **148** matching rows at that time, and all 20
  visible rows carried that supplier.
- Adding the inclusive date range `2016-06-15` to `2016-06-30` to that supplier filter yielded exactly
  one order, `4500000012`, dated `2016-06-15`.
- Opening it showed three real line items with `NetAmount` **440**, **400** and **150** USD; both the
  table row and the dialog showed the computed **990.00 USD** total and the raw status code **05**.
- Because the initial load already carried item-derived totals, the normal expanded-items path was
  confirmed against this real sandbox.

The row counts above are point-in-time observations of a shared, changing sandbox, not fixed
constants or sample data — nothing from that session is embedded in the page.

A read-only probe of the sandbox origin made earlier without a key showed that its `OPTIONS`
preflight answers `200` with `Access-Control-Allow-Origin: *` and `apikey` among the allowed headers
for an `Origin: null` request, while a `GET` with a missing or wrong key returns `401` carrying no
CORS headers. That is consistent with a `file://` page being able to call the service, but it is not
a substitute for a real double-click acceptance run.

**Not verified:**

- The refused-`$expand` fallback is covered by the stubbed integration run only; it was never forced
  to fail against the live service.
- Direct `file://` (double-click) end-to-end operation, as described under *Opening the app*.

### Live checks to run once you have a key

1. **Connect.** Paste the key and press **Load purchase orders**. Expected: rows appear, the status
   line stops saying it is loading, and the summary reports the page and row counts. A clean
   "Authentication failed" message means the key was rejected; a network/CORS failure with a key
   message means the gateway refused it before any CORS headers were sent.
2. **Totals.** Open a purchase order (click its PO number) and add its listed `NetAmount` values by
   hand in the stated currency. Expected: the drawer's total and the row's **Total value** match
   exactly, including decimal places.
3. **Status.** Compare a shown code with the same order in SAP (or with the raw JSON) and confirm it
   is the untouched `PurchasingProcessingStatus` value.
4. **Filter.** Enter a supplier ID seen in the table, apply, and confirm every remaining row carries
   that supplier. Then set a date range around one known order and confirm it is included at both
   ends (the range is inclusive).
5. **Paging.** Change **Rows per page** to 10, use **Next**, and confirm the page label and row count
   change while the data changes. Note whether a total row count is reported — if it is not, the app
   shows navigation only, which is the honest behaviour.
6. **Fallback path.** If the first load logs a `$expand` rejection (visible as a brief retry), open
   an order afterwards and confirm its items still load and the row total fills in.
7. **Clear.** Press **Clear connection** and confirm the key field, rows, summary and paging are all
   reset; reloading the page must not restore the key.

## CORS and sandbox limits (honest notes)

- The sandbox gateway returns CORS headers on **successful/preflight** responses but **not** on the
  `401` it returns for a missing or invalid key. In a browser that means a bad key can appear as a
  failed/blocked request rather than as a clean "401" message, so the app's network-error message
  also points at the key. Spaces at the ends of a pasted key are trimmed, so an accidental space
  does not break it.
- CORS is a browser rule, not a server one — the same request made with `curl` is not blocked.
- The app never disables browser security, never uses a public proxy, and never replays its key to
  another origin: redirects are refused and a relative `@odata.nextLink` is only followed when it
  resolves to the same service root you entered.
- The sandbox is rate-limited and its data is demo data; `429` and `5xx` responses are shown as such
  and are safe to retry from the inline **Try again** button.

## Privacy and design notes

The key lives in one JavaScript variable in memory. It is never placed in the URL, `localStorage`,
`sessionStorage`, cookies, the page source or any log, and `Clear connection` drops it along with all
fetched data. Requests time out after 20 seconds via `AbortController`.

The interface is English, uses system fonts and a restrained navy/blue palette, right-aligns numeric
columns, keeps one primary action per panel, and is usable with keyboard, screen reader and reduced
motion; status and error messages are announced through `aria-live` regions.
