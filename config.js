/* ============================================================
   KANKANA — booking configuration
   Everything a non-developer may need to change lives here:
   prices, capacities, GST rates, hold times, payment keys.
   ============================================================ */
window.KANKANA_CONFIG = {

  business: {
    name: 'Kankana Venue & Resorts',
    legalName: '[Registered business name]',
    gstin: '[GSTIN — 15 characters]',
    address: '[Street, City, State — PIN]',
    stateCode: '[State code]',
    phone: '[+91 phone number]',
    email: '[email@kankana.com]'
  },

  /* ---------- Payments (Razorpay) ----------
     demoMode: true  → no real money; a simulated checkout is shown.
     To go live: set demoMode false, add your Razorpay Key ID, and point
     api.createOrder at your server (it must create a Razorpay order and
     return { id, amount, currency }). Never put the Key SECRET here.   */
  payments: {
    demoMode: true,
    razorpayKeyId: '',            // e.g. 'rzp_live_XXXXXXXXXXXX'
    themeColor: '#d2ad72'
  },

  /* ---------- Server endpoints (optional) ----------
     Leave empty to run fully in the browser (demo).                    */
  api: {
    availability: '',   // GET  ?space=ID&from=YYYY-MM-DD&to=YYYY-MM-DD → booked data
    createOrder: '',    // POST { bookingId, amount }      → Razorpay order
    verifyPayment: '',  // POST { razorpay_payment_id, razorpay_order_id, razorpay_signature, bookingId }
    saveBooking: '',    // POST booking JSON               → stores booking, emails quotation
    getBooking: '',     // GET  ?id=KNK-XXXX&email=...     → booking JSON
    enquiry: ''         // POST enquiry form JSON          → emails your team
  },

  /* ---------- Admin (demo gate only — real admin login needs a server) ---------- */
  admin: { demoPasscode: 'kankana' },

  /* ---------- Policies ---------- */
  policy: {
    celebration: { advancePct: 30, holdHours: 72, minDays: 1, maxDays: 5 },
    stay:        { advancePct: 50, holdHours: 24, maxNights: 14 },
    unwind:      { advancePct: 100, holdHours: 0 }
  },

  /* ---------- GST (confirm with your CA) ----------
     Rates follow the GST notifications effective 22 Sep 2025:
     accommodation ≤ ₹7,500/night 5%, above 18%; event venues 18%;
     restaurant/café service 5%; sports facilities 18%.               */
  gst: {
    intraState: true,        // true → split into CGST + SGST; false → IGST
    venue: 18,
    accommodationLow: 5,     // tariff per unit per night ≤ threshold
    accommodationHigh: 18,
    accommodationThreshold: 7500,
    sports: 18,
    cafe: 5,
    catering: 18,
    services: 18
  },

  /* ---------- Celebrations: booked by the day (1–5 days) ---------- */
  venues: [
    { id: 'colonnade', name: 'The Colonnade',      type: 'Venue',    capacity: 500, pricePerDay: 380000, img: 'assets/img/arch-garden.jpg', blurb: 'Our grandest outdoor setting, framed by columns and flowers.' },
    { id: 'pavilions', name: 'Garden Pavilions',   type: 'Venue',    capacity: 250, pricePerDay: 220000, img: 'assets/img/tentdinner.jpg', blurb: 'Open-sided pavilions on the lawns for daytime rituals and dinners.' },
    { id: 'terrace',   name: 'The Sunset Terrace', type: 'Venue',    capacity: 150, pricePerDay: 180000, img: 'assets/img/balcony.jpg',    blurb: 'An intimate terrace that catches the last light of the day.' },
    { id: 'reception', name: 'Reception Hall',     type: 'Hall',     capacity: 800, pricePerDay: 350000, img: 'assets/img/venue-reception.jpg', blurb: 'Crimson drapes, crystal chandeliers and a floral stage, for receptions and grand dinners.' },
    { id: 'dining',    name: 'Dining Hall',        type: 'Hall',     capacity: 300, pricePerDay: 150000, img: 'assets/img/banquet.jpg',    blurb: 'A dedicated hall for seated meals and buffets.' },
    { id: 'amphi',     name: 'The Amphitheatre',   type: 'Open-air', capacity: 600, pricePerDay: 250000, img: 'assets/img/amphi-aerial.jpg', blurb: 'Tiered seating around a central mandap and lotus pools, lit by hundreds of lamps.' }
  ],

  /* ---------- Stays: booked by the night (up to 14) ---------- */
  stays: [
    { id: 'villa', name: 'Private Villas', unitName: 'villa', units: 6,  sleeps: 4, pricePerNight: 22000, img: 'assets/img/villa-pool.jpg', blurb: 'Bali-themed villas around the pool. Each sleeps 4.' },
    { id: 'room',  name: 'Guest Rooms',    unitName: 'room',  units: 20, sleeps: 2, pricePerNight: 7500,  img: 'assets/img/bedwarm.jpg',   blurb: 'Comfortable rooms for two, close to everything.' }
  ],

  /* ---------- Unwind: booked by the hour ---------- */
  unwind: [
    { id: 'turf',       name: 'Turf',             mode: 'hourly',  pricePerHour: 1800, maxPlayers: 22, open: 6, close: 23, maxHours: 4, gstKey: 'sports', img: 'assets/img/turfnight.jpg', blurb: 'Football, cricket and team games, day or night.' },
    { id: 'pickleball', name: 'Pickleball Court', mode: 'hourly',  pricePerHour: 900,  maxPlayers: 4,  open: 6, close: 22, maxHours: 3, gstKey: 'sports', img: 'assets/img/pickleball.jpg', blurb: 'Paddles out. No experience needed.' },
    { id: 'cafe',       name: 'The Café',         mode: 'sitting', pricePerGuest: 300, seats: 40, sittingHours: 2, open: 8, close: 22, gstKey: 'cafe', img: 'assets/img/cafe.jpg', blurb: 'Reserve a table for a 2-hour sitting.' }
  ],

  /* ---------- Wedding extras ---------- */
  foodPackages: [
    { id: 'essential', name: 'Essential', perGuestPerDay: 2600, blurb: 'The essentials, done beautifully.' },
    { id: 'signature', name: 'Signature', perGuestPerDay: 4200, blurb: 'More courses, more service.' },
    { id: 'royal',     name: 'Royal',     perGuestPerDay: 6800, blurb: 'Our most lavish menu and service.' }
  ],
  addons: [
    { id: 'sangeet',  name: 'Mehndi & Sangeet Night',  price: 350000, per: 'event', img: 'assets/img/stage.jpg' },
    { id: 'mandap',   name: 'Mandap & Ceremony Décor', price: 450000, per: 'event', img: 'assets/img/amphi-mandap.jpg' },
    { id: 'photo',    name: 'Photography & Film',      price: 280000, per: 'event', img: 'assets/img/confetti.jpg' },
    { id: 'baraat',   name: 'Baraat Procession',       price: 150000, per: 'event', img: 'assets/img/holi.jpg' },
    { id: 'kits',     name: 'Guest Welcome Kits',      price: 1800,   per: 'guest', img: 'assets/img/reception.jpg' },
    { id: 'transfer', name: 'Airport Transfers',       price: 1200,   per: 'guest', img: 'assets/img/couplepalms.jpg' }
  ]
};

/* ============================================================
   Admin overrides — prices, items, rules and settings edited in the
   admin dashboard are saved here and applied over the defaults above.
   (Demo: saved in this browser. Live: load them from your server.)
   ============================================================ */
(() => {
  const C = window.KANKANA_CONFIG;
  C.terms = C.terms || [
    'Dates are confirmed only on receipt of the advance.',
    'All prices are exclusive of GST. GST at the applicable rates is charged on the tax invoice.',
    'The balance is payable 30 days before the first event date.',
    'Guest numbers may be revised up to 21 days before; per-guest items are re-billed accordingly.',
    'Cancellation more than 90 days before: advance refunded less 10%. Within 90 days the advance is non-refundable.'
  ];
  C.policy.celebration.balanceDueDays = C.policy.celebration.balanceDueDays ?? 30;
  C.policy.quoteValidDays = C.policy.quoteValidDays ?? 7;
  C.defaults = JSON.parse(JSON.stringify(C));
  let o = {};
  try { o = JSON.parse(localStorage.getItem('knk_overrides_v1')) || {}; } catch {}
  const merge = (a, b) => { Object.keys(b || {}).forEach(k => { a[k] = (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k]) ? merge(a[k], b[k]) : b[k]; }); return a; };
  ['venues', 'stays', 'unwind', 'foodPackages', 'addons', 'terms'].forEach(k => { if (Array.isArray(o[k])) C[k] = o[k]; });
  ['policy', 'gst', 'business', 'admin', 'payments'].forEach(k => { if (o[k]) merge(C[k], o[k]); });
  // full lists (incl. hidden items) for existing bookings and the admin; the public site only shows "live" items
  C.all = { venues: C.venues, stays: C.stays, unwind: C.unwind, foodPackages: C.foodPackages, addons: C.addons };
  if (!/admin\.html/.test(location.pathname)) ['venues', 'stays', 'unwind', 'foodPackages', 'addons'].forEach(k => { C[k] = C[k].filter(x => x.live !== false); });
  C.saveOverrides = patch => { const cur = (() => { try { return JSON.parse(localStorage.getItem('knk_overrides_v1')) || {}; } catch { return {}; } })(); try { localStorage.setItem('knk_overrides_v1', JSON.stringify({ ...cur, ...patch })); } catch {} };
  C.resetOverrides = () => { try { localStorage.removeItem('knk_overrides_v1'); } catch {} };
})();
