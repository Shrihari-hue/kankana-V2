# Kankana — cinematic scroll website

Open `index.html` in Chrome, Safari or Edge. That's all you need (an internet connection is used for the fonts and the GSAP/Lenis animation libraries).

For the smoothest result, serve it locally:

    cd "Kankana V2"
    python3 -m http.server 8080
    # then open http://localhost:8080

## Files
- `index.html` — all sections and copy
- `styles.css` — design tokens (colors, type, spacing) at the top
- `main.js`   — every scroll scene, one block per section
- `assets/img/` — photography (free Unsplash license). Re-download with `./fetch-images.sh`

## Swapping in your own visuals
Replace any file in `assets/img/` keeping the same file name (e.g. your own `hero.jpg`).
To use a video in the hero, swap the `<img>` in `.l-hero` for
`<video src="assets/hero.mp4" autoplay muted loop playsinline></video>` and add `video{width:100%;height:100%;object-fit:cover}` to styles.css.

## Sections
00 Welcome — hero, flight into the cloud, lawns → amphitheatre → Bali villas → celebration
01 Explore — curved 3D gallery; glass card: Weddings / Celebrations & Parties / Corporate / Stay
02 Unwind — tiles collapse into points of light → horizon line → pool panorama
03 A day at Kankana — café & pickleball morning, turf & pool afternoon, amphitheatre evening
04 Our spaces — Lawns, Amphitheatre, Café, Turf, Pickleball, Bali Villas, Pool
05 Moments — sliced-slat transitions: Celebrate / Meet / Play / Stay
06 Showtime — falling light → beam → the stage
07 Facilities — split panels → blueprint lines → Celebrate / Play / Stay bento
08 Plan your event — zooms, enquiry buttons, giant wordmark

## To fill in (search index.html for "[")
- Address, phone and email in the final section
- "Plan your event" / "Book a villa" button links (currently "#") — e.g. a WhatsApp link https://wa.me/91XXXXXXXXXX
- Replace stock photos in assets/img with your own (same file names)

## Booking system (added)
New files: `config.js` (all prices, capacities, GST, policies, keys), `booking.js` (engine + booking drawer),
`booking.css`, `sections.js` (Explore venues, Celebrations, The wedding day, On the estate, Enquiry), `mybooking.html`.

**Change a price or capacity:** edit `config.js` only — every section, card, quote and PDF reads from it.

### What works right now (demo mode)
- Book any venue (1–5 days), villa/room (up to 14 nights), turf/court (hourly) or café table (2-hour sitting)
- Calendar shows only free dates/times (demo data + bookings made in this browser)
- Live price with GST (CGST/SGST split), advance %, 72h / 24h holds
- Simulated Razorpay checkout (UPI / card / netbanking) — no money taken
- Quotation, tax invoice and receipt PDFs
- My Booking page: status, hold countdown, documents, pay balance
- Enquiry form

### To go live you need a small server for
1. **Razorpay** — create orders and verify payment signatures (the Key *Secret* must never be in the website).
   Then in `config.js`: `payments.demoMode = false`, `razorpayKeyId = 'rzp_live_…'`, `api.createOrder`, `api.verifyPayment`.
2. **Shared availability & bookings** — a database so every visitor sees the same calendar
   (`api.availability`, `api.saveBooking`, `api.getBooking`). Demo mode stores bookings in each visitor's browser only.
3. **Emails** — send the quotation / invoice / receipt PDFs (triggered from `api.saveBooking`).
4. **Enquiries** — `api.enquiry` to email your team.
5. Fill in `business` (legal name, GSTIN, address, phone, email) and have your CA confirm the GST rates.

## Admin dashboard (`admin.html`)
Open `admin.html` (demo passcode: `kankana`, set in config.js → admin.demoPasscode). Not linked from the public site.
- **Overview** — collected this month, outstanding balances, next-30-day bookings, holds, payments chart, today's schedule, 14-day occupancy, expiring holds, new enquiries
- **Bookings** — filter by status/type, search, export CSV; open any booking to record offline payments (cash, bank transfer, UPI, cheque),
  extend holds, cancel, download quotation/invoice/receipts, email or WhatsApp the customer, add internal notes
- **Calendar** — month timeline for every venue, villas, rooms, turf and court; day schedule for turf, court and café seats
- **Enquiries** — inbox with status (new / contacted / converted / closed), notes, call / email / WhatsApp, start a booking
- **Blocked dates** — close any space (or some villas/rooms) for maintenance or offline bookings; the website calendar updates instantly
- **Pricing & policies** — everything from config.js at a glance
"Load sample data" fills the dashboard with realistic demo bookings. "Reset demo data" clears this browser.
The passcode screen is a demo gate only — real staff logins must be handled by the server.

### Admin additions
- **Quotation generator** — build a quote for any client (GSTIN, city, venues, dates, package, villas/rooms, services, custom line items, ₹ or % discount, notes) with a live preview; save & email, save as enquiry, or preview the PDF
- **Customers** — everyone who has booked, with value, paid and balance; click to see their bookings
- **Venues & pricing** — edit names, capacities, prices, descriptions and photos; add/remove venues, packages and services; untick *Live* to hide an item from the website
- **Discounts** — promo codes (% or ₹, scope, minimum spend, dates, usage limit) that guests enter at checkout; plus per-booking discounts from any booking's panel
- **Payments** — every payment with filters, totals, receipts and CSV export
- **Automated emails** — log of every quotation, receipt, reminder, hold and cancellation email (sent once the server is connected)
- **Settings** — booking rules, GST rates, company details on documents, quotation terms, passcode, CSV export, full backup & restore
- **Calendar** — click a free venue day to block it, click a blocked day to unblock
Pricing and settings changes are saved in the browser in demo mode; with the server they should be stored centrally (see api section).

## Intro screen
Velvet rose background (drawn in code) with the gold monogram, a light sweep and a fade into the hero.
**Use your real logo:** save it as `assets/brand/kankana-logo.png` (transparent PNG, ~800px wide). The intro switches to it automatically and keeps the shine.
The full intro plays once per visit; repeat page loads in the same session play it faster.

## Booking page (`book.html`)
Dedicated page with tabs for Celebrations, Villas & Rooms, Turf & Pickleball and Café; numbered steps; calendar showing
available / on hold / booked / unavailable dates; packages, services and guest stays; client details incl. city, state and GSTIN;
a live instant-quotation sidebar with promo codes; "Pay advance" or "Save quotation · Pay later"; and a confirmation screen with the
booking ID, PDFs and a Track booking link. Deep links: `book.html?type=event|stay|sport|cafe` and `&item=colonnade` etc.

## Documents
Quotation, tax invoice and receipt PDFs use the Kankana letterhead (your logo from assets/brand/kankana-logo.png when present),
numbered lines with qty and rate, GST by rate (CGST/SGST split on invoices), advance / balance bands, terms, how-to-pay and signatory.
Numbers run in sequence per financial year: bookings KNK-1001…, quotations KNK/Q/26-27/0001, invoices KNK/INV/26-27/0001, receipts KNK/RC/26-27/0001.
Quotations are valid for 7 days (policy.quoteValidDays in config.js).
