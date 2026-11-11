/* Food Rescue dashboards: login, donor and receiver in one script.
   Browser-only demo: accounts, requests and listings live in this browser's localStorage.
   Listings and the donor account use the same keys as script.js, so the main site keeps working. */
(() => {
"use strict";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const K = { l: "foodRescue.listings.v2", a: "foodRescue.account.v1", u: "foodRescue.users.v1", s: "foodRescue.session.v1", r: "foodRescue.requests.v1" };
const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const arr = (k) => { const a = get(k, []); return Array.isArray(a) ? a : []; };
const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { toast("Could not save in this browser. Storage may be full.", "error"); return false; } };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "fr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
const H = 36e5;
const fmt = (i) => new Date(i).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const left = (iso) => { const d = +new Date(iso) - Date.now(); if (d <= 0) return "deadline passed"; const m = Math.floor(d / 6e4), dd = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60); return dd ? `${dd}d ${h}h left` : h ? `${h}h ${m % 60}m left` : `${m % 60}m left`; };
const loc = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
const home = (r) => r === "donor" ? "donor-dashboard.html" : "receiver-dashboard.html";
const CATS = ["Cooked Meals", "Bakery & Snacks", "Fruits & Vegetables", "Packaged Food", "Dairy & Beverages"];
const ART = { "Cooked Meals": "🍛", "Bakery & Snacks": "🥐", "Fruits & Vegetables": "🥦", "Packaged Food": "📦", "Dairy & Beverages": "🥛" };
const METHODS = [["fssai", "FSSAI licence"], ["identity", "Identity"], ["contact", "Phone / email"], ["address", "Address"], ["documents", "Licences & certificates"]];
const ICON = {
  leaf: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', trash: '<path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14"/>',
  pin: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', box: '<path d="M21 16V8l-9-5-9 5v8l9 5z"/><path d="M3.3 7 12 12l8.7-5M12 22V12"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>', out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'
};
const ic = (n) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${ICON[n]}</svg>`;

/* ---------- Small shared helpers ---------- */
function toast(msg, type = "success") {
  const c = $("#toasts"); if (!c) return;
  const t = document.createElement("div");
  t.className = "toast " + (type === "success" ? "" : type); t.setAttribute("role", type === "error" ? "alert" : "status");
  t.innerHTML = ic(type === "error" ? "x" : "check") + '<span></span><button type="button" aria-label="Dismiss">×</button>';
  t.children[1].textContent = msg;
  const rm = () => { t.classList.add("hide"); setTimeout(() => t.remove(), 300); };
  t.lastChild.onclick = rm; c.append(t);
  try { if (c.matches(":popover-open")) c.hidePopover(); c.showPopover(); } catch { /* older browsers */ }
  setTimeout(rm, 5000);
}
const pill = (s) => `<span class="pill p-${s}">${{ pending: "Pending", approved: "Approved", completed: "Completed", expired: "Expired", declined: "Declined", cancelled: "Cancelled" }[s]}</span>`;
const empty = (i, t, p, a = "") => `<div class="empty-state"><div class="empty-icon">${ic(i)}</div><h3>${t}</h3><p>${p}</p>${a}</div>`;
const fld = (l, n, v = "", a = "", t = "text", c = "") => `<label class="field ${c}">${l}<input type="${t}" name="${n}" value="${esc(v)}" ${a}></label>`;
const txt = (l, n, v = "") => `<label class="field full">${l}<textarea name="${n}" rows="3" maxlength="300">${esc(v)}</textarea></label>`;
const sel = (l, n, o, v = "", c = "") => `<label class="field ${c}">${l}<select name="${n}">${o.map((x) => { const [a, b] = Array.isArray(x) ? x : [x, x]; return `<option value="${esc(a)}" ${a === v ? "selected" : ""}>${esc(b)}</option>`; }).join("")}</select></label>`;
function modal(title, body, onSubmit, ok = "Save") {
  const d = $("#dlg");
  d.innerHTML = `<form novalidate><div class="dialog-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-x aria-label="Close">${ic("x")}</button></div><div class="dialog-body">${body}<p class="error" id="mErr" role="alert"></p><div class="dialog-actions"><button type="button" class="btn btn-ghost" data-x>Cancel</button><button class="btn btn-primary">${ok}</button></div></div></form>`;
  $$("[data-x]", d).forEach((b) => b.onclick = () => d.close());
  $("form", d).onsubmit = (e) => { e.preventDefault(); const er = onSubmit(Object.fromEntries(new FormData(e.target))); if (er) { $("#mErr", d).textContent = er; return; } d.close(); };
  d.showModal();
}

/* ---------- Accounts (role-based login) ---------- */
const users = () => arr(K.u);
const me = () => { const s = get(K.s, null); return s && users().find((u) => u.id === s.id) || null; };
const saveUser = (id, fn) => { const us = users(), x = us.find((u) => u.id === id); if (x) { fn(x); put(K.u, us); } };
async function hash(p, salt) {
  const t = salt + p;
  if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join(""); }
  return btoa(unescape(encodeURIComponent(t))); // fallback for non-secure contexts (demo only)
}
/** Donors share the main site's verification account. Make the logged-in donor's account the active one in this browser. */
function activate(u) {
  const us = users(), cur = get(K.a, null);
  if (cur && cur.id) { const o = us.find((x) => x.acct && x.acct.id === cur.id); if (o) o.acct = cur; }
  const m = us.find((x) => x.id === u.id);
  if (m && m.acct) put(K.a, m.acct);
  put(K.u, us);
}
const PH = /^[+\d][\d\s-]{6,14}$/;
const profileOk = (u) => u.name && u.org && PH.test((u.phone || "").trim()) && (u.address || "").trim().length >= 3;
const vs = (a, id) => { const m = a && a.methods && a.methods[id]; return m && (m.status === "verified" || m.status === "pending") ? m.status : "none"; };
const accStat = (a) => METHODS.every((m) => vs(a, m[0]) === "verified") ? "verified" : METHODS.some((m) => vs(a, m[0]) !== "none") ? "pending" : "required";
const allSent = (a) => METHODS.every((m) => vs(a, m[0]) !== "none");
const VB = { verified: ["Verified", "v-verified"], pending: ["Pending Review", "v-pending"], required: ["Verification Required", "v-required"], none: ["Not started", "v-none"] };
const vbadge = (s) => { const v = VB[s] || VB.required; return `<span class="vbadge ${v[1]}">${v[0]}</span>`; };

function loginPage() {
  const u0 = me(); if (u0) { location.replace(home(u0.role)); return; }
  const f = $("#authForm"); let mode = "login";
  const q = new URLSearchParams(location.search).get("role"); if (q === "receiver") $("#rR").checked = true;
  const paint = () => {
    const role = f.role.value;
    $$(".su").forEach((e) => e.hidden = mode !== "signup");
    $("#orgL").textContent = role === "donor" ? "Restaurant or organisation" : "NGO, hostel or community";
    $("#addrL").textContent = role === "donor" ? "Pickup address" : "Area / city";
    $("#sub").textContent = mode === "login" ? "Log in" : "Create account";
    $("#pw").autocomplete = mode === "login" ? "current-password" : "new-password";
    $$("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.mode === mode));
    $("#authErr").textContent = "";
  };
  $$("[data-mode]").forEach((b) => b.onclick = () => { mode = b.dataset.mode; paint(); });
  $$("input[name=role]").forEach((r) => r.onchange = paint);
  f.onsubmit = async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f)), em = d.email.trim().toLowerCase(), us = users(), fail = (m) => { $("#authErr").textContent = m; };
    if (!/^\S+@\S+\.\S+$/.test(em)) return fail("Enter a valid email address.");
    if (d.password.length < 6) return fail("Password must be at least 6 characters.");
    let u = us.find((x) => x.email === em);
    if (mode === "login") {
      if (!u || u.hash !== await hash(d.password, u.salt)) return fail("Email or password is incorrect.");
      if (u.role !== d.role) return fail(`This is a ${u.role} account. Choose “${u.role === "donor" ? "Donor" : "Receiver"}” above to log in.`);
    } else {
      if (u) return fail("An account with this email already exists. Log in instead.");
      const name = d.name.trim(), org = d.org.trim(), phone = d.phone.trim(), address = d.address.trim();
      if (name.length < 2 || org.length < 2) return fail("Enter your name and organisation (at least 2 characters each).");
      if (!PH.test(phone)) return fail("Enter a valid phone number.");
      if (address.length < 3) return fail(d.role === "donor" ? "Enter your pickup address." : "Enter your area or city.");
      const salt = uid();
      u = { id: uid(), role: d.role, name, org, email: em, phone, address, salt, hash: await hash(d.password, salt), createdAt: Date.now() };
      if (u.role === "donor") { const a = get(K.a, null), owned = a && us.some((x) => x.acct && x.acct.id === a.id); u.acct = a && a.id && a.methods && !owned ? a : { id: uid(), name: org, methods: {} }; }
      us.push(u); if (!put(K.u, us)) return;
    }
    if (u.role === "donor") activate(u);
    put(K.s, { id: u.id }); location.replace(home(u.role));
  };
  paint();
}

/* ---------- Listings and requests ---------- */
const lsAll = () => arr(K.l).filter((l) => l && l.id && !l.sample);
const reqs = () => arr(K.r);
const isExp = (l) => l.status !== "Picked Up" && (+new Date(l.deadline) <= Date.now() || +new Date(l.expiresAt) <= Date.now());
const dStat = (l) => l.status === "Picked Up" ? "completed" : isExp(l) ? "expired" : l.status === "Reserved" ? "approved" : "pending";
const kgOf = (l) => ["kg", "litres"].includes(l.quantityUnit) ? +l.quantityAmount || 0 : l.servings * 0.4;
/** Keep requests consistent with listings (the main site can also reserve or collect food). */
function sync() {
  const ls = arr(K.l), rs = reqs(); let ch = false;
  rs.forEach((r) => {
    const l = ls.find((x) => x.id === r.listingId), old = r.status;
    if (r.status === "pending" && (!l || l.status !== "Available" || isExp(l))) r.status = "declined";
    else if (r.status === "approved") { if (!l || isExp(l)) r.status = "cancelled"; else if (l.status === "Picked Up") r.status = "completed"; }
    if (r.status !== old) { r.updatedAt = Date.now(); ch = true; }
  });
  if (ch) put(K.r, rs);
}
function collect(id) {
  const a = arr(K.l), l = a.find((x) => x.id === id);
  if (!l || l.status !== "Reserved" || isExp(l)) { toast("This food can’t be marked as collected.", "error"); return; }
  l.status = "Picked Up"; l.pickedAt = Date.now();
  if (put(K.l, a)) { toast(`${l.servings} ${l.servings === 1 ? "meal" : "meals"} marked as collected. Thank you!`); draw(); }
}
const donorAcct = (id) => { const a = get(K.a, null); if (a && a.id === id) return a; const o = users().find((x) => x.acct && x.acct.id === id); return o && o.acct; };
const donorUser = (id) => users().find((x) => x.acct && x.acct.id === id);

/* ---------- Donor ---------- */
function donationForm(l) {
  const v = l || {}, t = (x, add) => loc(x ? new Date(x) : new Date(Date.now() + add * H)), u = me();
  return `<div class="form-grid">
    ${fld("Food name *", "name", v.name, 'maxlength="60" autocomplete="off"', "text", "full")}
    ${sel("Category *", "category", [["", "Select a category"], ...CATS], v.category)}
    ${sel("Veg / Non-Veg *", "diet", [["", "Select"], ["veg", "Veg"], ["nonveg", "Non-Veg"]], v.diet)}
    ${fld("Servings (meals) *", "servings", v.servings, 'min="1" max="5000" step="1" inputmode="numeric"', "number")}
    ${sel("Food condition *", "condition", [["", "Select condition"], ["hot", "Freshly cooked (hot)"], ["cooled", "Cooked and cooled"], ["sealed", "Packaged and sealed"], ["produce", "Fresh produce (uncut)"], ["dry", "Baked or dry food"]], v.condition)}
    ${sel("Storage *", "storage", [["", "Select storage"], ["hot", "Hot-held (above 60°C)"], ["chilled", "Refrigerated (below 5°C)"], ["room", "Room temperature"], ["frozen", "Frozen"]], v.storage)}
    ${fld("Prepared / packed on *", "preparedAt", l ? t(v.preparedAt) : t(0, 0), "", "datetime-local")}
    ${fld("Use-by time *", "expiresAt", t(v.expiresAt, 6), "", "datetime-local")}
    ${fld("Pickup deadline *", "deadline", t(v.deadline, 3), "", "datetime-local", "full")}
    ${fld("Pickup location *", "location", v.location || u.address || "", 'maxlength="100"', "text", "full")}
    ${txt("Notes, allergens and storage <span class=\"optional\">(optional)</span>", "notes", v.notes)}
    <label class="chk full"><input type="checkbox" name="safe"><span>This food is hygienic, not partly eaten, stored as described and safe to eat. *</span></label></div>`;
}
function readDonation(f) {
  const now = Date.now(), n = +f.servings, P = +new Date(f.preparedAt), X = +new Date(f.expiresAt), D = +new Date(f.deadline);
  if ((f.name || "").trim().length < 2) return "Enter the food name (at least 2 characters).";
  if (!f.category) return "Choose a food category.";
  if (!f.diet) return "Mark the food as Veg or Non-Veg.";
  if (!Number.isInteger(n) || n < 1 || n > 5000) return "Servings must be a whole number from 1 to 5000.";
  if (!f.condition) return "Choose the food condition.";
  if (!f.storage) return "Choose how the food is stored.";
  if (!f.preparedAt || P > now + 3e5) return "Enter a preparation time that is not in the future.";
  if (!f.expiresAt || !(X > now) || X <= P) return "Use-by time must be in the future and after the preparation time.";
  if (!f.deadline || !(D > now) || D > X) return "Pickup deadline must be in the future and before the use-by time.";
  if (["hot", "cooled"].includes(f.condition) && f.storage === "room" && D > P + 4 * H) return "Cooked food at room temperature must be collected within 4 hours of preparation.";
  if ((f.location || "").trim().length < 3) return "Enter the pickup location.";
  if (!f.safe) return "Confirm the food-safety statement. Unsafe food must not be donated.";
  return null;
}
const donationFields = (f) => ({ name: f.name.trim(), category: f.category, diet: f.diet, servings: +f.servings, quantityAmount: +f.servings, quantityUnit: "portions", condition: f.condition, storage: f.storage, preparedAt: new Date(f.preparedAt).toISOString(), expiresAt: new Date(f.expiresAt).toISOString(), deadline: new Date(f.deadline).toISOString(), location: f.location.trim(), notes: (f.notes || "").trim() });

const ACT = {
  tab: (i) => { tab = +i; draw(); },
  dfilter: (v) => { F.ds = v; draw(); },
  rfilter: (v) => { F.rs = v; draw(); },
  clr: () => { F.q = ""; F.cat = "all"; F.loc = ""; draw(); },
  review: () => { tab = 1; draw(); },
  collect,
  add() {
    const u = me();
    if (!profileOk(u)) { toast("Complete your profile first. All profile fields are mandatory.", "error"); tab = 3; draw(); return; }
    if (!allSent(u.acct)) { toast("Verification is mandatory. Submit all five verification methods before adding a donation.", "error"); tab = 3; draw(); return; }
    modal("Add a donation", donationForm(), (f) => {
      const e = readDonation(f); if (e) return e;
      const a = arr(K.l);
      a.unshift({ id: uid(), ...donationFields(f), donor: u.org || u.name, donorId: u.acct.id, image: "", status: "Available", reservedBy: "", reservedOrg: "", verification: "required", sample: false, createdAt: Date.now() });
      if (!put(K.l, a)) return "Could not save. Storage may be full.";
      toast(`“${f.name.trim()}” was added and now appears in Find Food.`); draw();
    }, "Add donation");
  },
  edit(id) {
    const l = lsAll().find((x) => x.id === id);
    if (!l || dStat(l) !== "pending") { toast("Only pending donations can be edited.", "error"); return; }
    modal("Edit donation", donationForm(l), (f) => {
      const e = readDonation(f); if (e) return e;
      const a = arr(K.l), x = a.find((i) => i.id === id);
      if (!x || x.status !== "Available") return "This donation was requested meanwhile, so it can’t be edited.";
      Object.assign(x, donationFields(f)); if (!put(K.l, a)) return "Could not save.";
      toast("Donation updated."); draw();
    }, "Save changes");
  },
  del(id) {
    const l = lsAll().find((x) => x.id === id); if (!l || l.status === "Picked Up") return;
    if (!confirm(l.status === "Reserved" ? "This donation is approved for a receiver. Deleting it cancels their request. Delete anyway?" : "Delete this donation? Any pending requests will be declined.")) return;
    const rs = reqs(); rs.forEach((r) => { if (r.listingId === id && ["pending", "approved"].includes(r.status)) { r.status = r.status === "pending" ? "declined" : "cancelled"; r.updatedAt = Date.now(); } });
    put(K.r, rs); if (put(K.l, arr(K.l).filter((x) => x.id !== id))) { toast("Donation deleted.", "info"); draw(); }
  },
  approve(id) {
    const u = me(), r = reqs().find((x) => x.id === id); if (!r || r.status !== "pending") return;
    modal("Approve request", `<p class="v-help">${esc(r.org)} asked for “${esc(r.food)}”. Add pickup details for them.</p><div class="form-grid">${fld("Pickup contact *", "who", u.name)}${fld("Contact phone", "phone", u.phone || "", 'inputmode="tel"', "tel")}${txt("Pickup instructions", "note")}</div>`, (f) => {
      if (f.who.trim().length < 2) return "Enter who the receiver should ask for.";
      const a = arr(K.l), l = a.find((x) => x.id === r.listingId);
      if (!l || l.status !== "Available" || isExp(l)) return "This donation is no longer available.";
      l.status = "Reserved"; l.reservedBy = r.name; l.reservedOrg = r.org;
      const rs = reqs(); rs.forEach((x) => { if (x.listingId !== l.id) return; if (x.id === r.id) { x.status = "approved"; x.pickup = { who: f.who.trim(), phone: f.phone.trim(), note: (f.note || "").trim() }; } else if (x.status === "pending") x.status = "declined"; x.updatedAt = Date.now(); });
      if (put(K.l, a) && put(K.r, rs)) { toast(`Approved for ${r.org}.`); draw(); }
    }, "Approve");
  },
  decline(id) {
    const rs = reqs(), r = rs.find((x) => x.id === id); if (!r || r.status !== "pending" || !confirm("Decline this request?")) return;
    r.status = "declined"; r.updatedAt = Date.now(); put(K.r, rs); toast("Request declined.", "info"); draw();
  },
  request(id) {
    const u = me(), l = lsAll().find((x) => x.id === id);
    if (!l || l.status !== "Available" || isExp(l)) { toast("This food is no longer available.", "error"); draw(); return; }
    if (!profileOk(u)) { toast("Complete your profile first. All profile fields are mandatory.", "error"); tab = 3; draw(); return; }
    modal("Request food", `<p class="v-help">${esc(l.name)} · ${l.servings} servings from ${esc(l.donor)}. The donor reviews your request and shares pickup details if approved.</p><div class="form-grid">${fld("Contact person *", "name", u.name)}${fld("Phone *", "phone", u.phone || "", 'inputmode="tel"', "tel")}${txt("Message to the donor <span class=\"optional\">(optional)</span>", "message")}</div>`, (f) => {
      if (f.name.trim().length < 2) return "Enter a contact name (at least 2 characters).";
      if (!/^[+\d][\d\s-]{6,14}$/.test(f.phone.trim())) return "Enter a valid phone number.";
      const cur = lsAll().find((x) => x.id === id), rs = reqs();
      if (!cur || cur.status !== "Available" || isExp(cur)) return "This food is no longer available.";
      if (rs.some((r) => r.listingId === id && r.receiverId === u.id && ["pending", "approved"].includes(r.status))) return "You already requested this food.";
      rs.unshift({ id: uid(), listingId: id, food: cur.name, donor: cur.donor, receiverId: u.id, name: f.name.trim(), org: u.org, phone: f.phone.trim(), message: (f.message || "").trim(), status: "pending", createdAt: Date.now(), updatedAt: Date.now() });
      if (put(K.r, rs)) { saveUser(u.id, (x) => { x.phone = x.phone || f.phone.trim(); }); toast("Request sent. Track it under My requests."); tab = 1; draw(); }
    }, "Send request");
  },
  cancel(id) {
    const rs = reqs(), r = rs.find((x) => x.id === id); if (!r || !["pending", "approved"].includes(r.status) || !confirm("Cancel this request?")) return;
    if (r.status === "approved") { const a = arr(K.l), l = a.find((x) => x.id === r.listingId); if (l && l.status === "Reserved") { l.status = "Available"; l.reservedBy = ""; l.reservedOrg = ""; put(K.l, a); } }
    r.status = "cancelled"; r.updatedAt = Date.now(); put(K.r, rs); toast("Request cancelled.", "info"); draw();
  }
};

function donorView(u) {
  const acc = u.acct, ls = lsAll().filter((l) => l.donorId === acc.id).sort((a, b) => b.createdAt - a.createdAt), rs = reqs().filter((r) => ls.some((l) => l.id === r.listingId));
  const c = (s) => ls.filter((l) => dStat(l) === s).length, pend = rs.filter((r) => r.status === "pending");
  const chip = (act, cur, v, label) => `<button class="chip" data-act="${act}" data-id="${v}" aria-pressed="${cur === v}">${label}</button>`;
  const card = (l) => {
    const s = dStat(l), n = pend.filter((r) => r.listingId === l.id).length;
    const b = (a, label, cls = "btn-ghost") => `<button class="btn ${cls} btn-sm" data-act="${a}" data-id="${l.id}">${label}</button>`;
    const acts = s === "pending" ? (n ? b("review", "Review requests", "btn-primary").replace(` data-id="${l.id}"`, "") : "") + b("edit", ic("edit") + " Edit") + b("del", ic("trash") + " Delete", "btn-danger")
      : s === "approved" ? b("collect", "Mark collected", "btn-primary") + b("del", ic("trash") + " Delete", "btn-danger") : s === "expired" ? b("del", ic("trash") + " Delete", "btn-danger") : "";
    return `<article class="item"><div class="ih"><span class="art">${ART[l.category] || "🍽️"}</span><div><h3>${esc(l.name)}</h3><small>${esc(l.category)} · ${l.servings} servings</small></div>${pill(s)}</div>
      <p class="meta">${ic("pin")}${esc(l.location)}</p><p class="meta">${ic("clock")}Pickup by ${fmt(l.deadline)} · ${s === "completed" ? "collected" : left(l.deadline)}</p>
      ${l.reservedBy && s !== "pending" ? `<p class="meta">${ic("user")}${esc(l.reservedBy)}${l.reservedOrg ? " · " + esc(l.reservedOrg) : ""}</p>` : ""}
      ${s === "pending" && n ? `<p class="note">${n} request${n > 1 ? "s" : ""} waiting for your review</p>` : ""}${acts ? `<div class="acts">${acts}</div>` : ""}</article>`;
  };
  const T0 = () => {
    const list = ls.filter((l) => F.ds === "all" || dStat(l) === F.ds);
    return `<div class="bar"><h2>Your donations</h2><button class="btn btn-accent" data-act="add">${ic("plus")} Add donation</button></div>
      <div class="chips">${[["all", "All"], ["pending", "Pending"], ["approved", "Approved"], ["completed", "Completed"], ["expired", "Expired"]].map((x) => chip("dfilter", F.ds, x[0], x[1])).join("")}</div>
      ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : ls.length ? empty("box", "No donations here", "Nothing matches this status yet.", `<div class="empty-actions"><button class="btn btn-outline" data-act="dfilter" data-id="all">Show all</button></div>`)
        : empty("box", "No donations yet", "Add your first surplus food and receivers nearby can request it.", `<div class="empty-actions"><button class="btn btn-accent" data-act="add">${ic("plus")} Add donation</button></div>`)}`;
  };
  const rcard = (r) => `<article class="item"><div class="ih"><span class="art">🤝</span><div><h3>${esc(r.food)}</h3><small>${esc(r.org)} · ${esc(r.name)}</small></div>${pill(r.status)}</div>
    <p class="meta">${ic("clock")}Requested ${fmt(r.createdAt)}</p><p class="meta">${ic("user")}${esc(r.phone)}</p>${r.message ? `<p class="meta">“${esc(r.message)}”</p>` : ""}
    ${r.status === "pending" ? `<div class="acts"><button class="btn btn-primary btn-sm" data-act="approve" data-id="${r.id}">Approve</button><button class="btn btn-ghost btn-sm" data-act="decline" data-id="${r.id}">Decline</button></div>`
      : r.status === "approved" ? `<div class="acts"><button class="btn btn-primary btn-sm" data-act="collect" data-id="${r.listingId}">Mark collected</button></div>` : ""}</article>`;
  const T1 = () => !rs.length ? empty("box", "No requests yet", "When a receiver requests your food, it appears here for approval.")
    : `<h2 class="sub" style="margin-top:0">Waiting for review (${pend.length})</h2>${pend.length ? `<div class="grid">${pend.map(rcard).join("")}</div>` : `<p class="count">Nothing to review right now.</p>`}
      ${rs.length > pend.length ? `<h2 class="sub">Earlier requests</h2><div class="grid">${rs.filter((r) => r.status !== "pending").map(rcard).join("")}</div>` : ""}`;
  const done = ls.filter((l) => dStat(l) === "completed"), meals = done.reduce((s, l) => s + l.servings, 0), kg = Math.round(done.reduce((s, l) => s + kgOf(l), 0));
  const ngos = new Set(done.map((l) => (l.reservedOrg || "").trim().toLowerCase()).filter(Boolean)).size;
  const T2 = () => {
    const now = new Date(), mo = [...Array(6)].map((_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1); return { k: d.getFullYear() * 12 + d.getMonth(), n: d.toLocaleString(undefined, { month: "short" }), v: 0 }; });
    done.forEach((l) => { const d = new Date(l.pickedAt || l.createdAt), m = mo.find((x) => x.k === d.getFullYear() * 12 + d.getMonth()); if (m) m.v += l.servings; });
    const max = Math.max(1, ...mo.map((m) => m.v)), hist = ls.filter((l) => ["completed", "expired"].includes(dStat(l)));
    return `<div class="stats"><div class="stat"><b>${meals}</b><span>Meals rescued</span></div><div class="stat"><b>${kg} kg</b><span>Food waste prevented (estimate)</span></div><div class="stat"><b>${ngos}</b><span>NGOs &amp; communities supported</span></div></div>
      <div class="box"><h2>Meals collected per month</h2>${done.length ? `<div class="bars">${mo.map((m) => `<div><span>${m.v || ""}</span><i style="height:${Math.round(m.v / max * 100)}%"></i>${m.n}</div>`).join("")}</div>` : `<p class="count">Your chart appears after your first donation is collected.</p>`}</div>
      <div class="box"><h2>Donation history</h2>${hist.length ? `<ul class="rows">${hist.map((l) => `<li><span><b>${esc(l.name)}</b><small>${l.servings} servings · ${fmt(l.pickedAt || l.deadline)}${l.reservedOrg ? " · " + esc(l.reservedOrg) : ""}</small></span>${pill(dStat(l))}</li>`).join("")}</ul>` : `<p class="count">Completed and expired donations are listed here.</p>`}</div>`;
  };
  const T3 = () => `${profileForm(u)}<div class="box"><div class="bar"><h2>Verification status</h2>${vbadge(accStat(acc))}</div>
    <p class="v-help">Verification is mandatory before you can add donations. Submit all five methods on the main site. Nothing shows as Verified unless a real verification service confirms it.</p>
    <ul class="rows">${METHODS.map((m) => `<li>${m[1]}${vbadge(vs(acc, m[0]))}</li>`).join("")}</ul>
    <div class="acts"><a class="btn btn-primary btn-sm" href="index.html#verify">Open verification forms</a></div></div>`;
  return { title: "Donor dashboard", stats: [[ls.length, "Total donations"], [c("pending"), "Pending"], [c("approved"), "Approved"], [c("completed"), "Completed"]],
    tabs: [["Donations", T0], ["Requests" + (pend.length ? ` (${pend.length})` : ""), T1], ["History & impact", T2], ["Profile & verification", T3]] };
}

/* ---------- Receiver ---------- */
function openFood() { return lsAll().filter((l) => l.status === "Available" && !isExp(l)); }
function fillBrowse() {
  const u = me(), q = F.q.toLowerCase(), lo = F.loc.toLowerCase(), mineR = reqs().filter((r) => r.receiverId === u.id && ["pending", "approved"].includes(r.status));
  const items = openFood().filter((l) => (F.cat === "all" || l.category === F.cat) && (!q || [l.name, l.donor, l.category].join(" ").toLowerCase().includes(q)) && (!lo || String(l.location).toLowerCase().includes(lo))).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
  $("#res").innerHTML = items.length ? `<p class="count" aria-live="polite">${items.length} available</p><div class="grid">${items.map((l) => {
    const dv = donorAcct(l.donorId), has = mineR.some((r) => r.listingId === l.id);
    return `<article class="item"><div class="ih"><span class="art">${ART[l.category] || "🍽️"}</span><div><h3>${esc(l.name)}</h3><small>${[esc(l.category), l.diet === "veg" ? "Veg" : l.diet === "nonveg" ? "Non-veg" : ""].filter(Boolean).join(" · ")}</small></div></div>
      <p class="meta">${ic("user")}${esc(l.donor)} ${vbadge(dv ? accStat(dv) : l.verification || "required")}</p><p class="meta">${ic("box")}${l.servings} servings</p>
      <p class="meta">${ic("pin")}${esc(l.location)}</p><p class="meta">${ic("clock")}Pickup by ${fmt(l.deadline)} · ${left(l.deadline)}</p>
      <div class="acts">${has ? `<button class="btn btn-ghost btn-sm" disabled>Requested</button>` : `<button class="btn btn-primary btn-sm" data-act="request" data-id="${l.id}">Request food</button>`}</div></article>`;
  }).join("")}</div>`
    : openFood().length ? empty("search", "No food matches your search", "Try a different word, category or area.", `<div class="empty-actions"><button class="btn btn-outline" data-act="clr">Clear filters</button></div>`)
      : empty("box", "No food available right now", "New donations show up here as soon as donors list them. Check back soon.");
}
function recvView(u) {
  const rs = reqs().filter((r) => r.receiverId === u.id), cnt = (s) => rs.filter((r) => r.status === s).length;
  const chip = (v, label) => `<button class="chip" data-act="rfilter" data-id="${v}" aria-pressed="${F.rs === v}">${label}</button>`;
  const T0 = () => `<div class="toolbar t3"><div class="search-wrap">${ic("search")}<input type="search" data-f="q" value="${esc(F.q)}" placeholder="Search food or donor" aria-label="Search food"></div>
    <select data-f="cat" aria-label="Filter by category"><option value="all">All categories</option>${CATS.map((x) => `<option ${F.cat === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
    <div class="search-wrap">${ic("pin")}<input type="search" data-f="loc" value="${esc(F.loc)}" placeholder="Location or area" aria-label="Filter by location"></div></div><div id="res"></div>`;
  const card = (r) => {
    const l = lsAll().find((x) => x.id === r.listingId), du = l && donorUser(l.donorId), p = r.pickup || {};
    return `<article class="item"><div class="ih"><span class="art">🍽️</span><div><h3>${esc(r.food)}</h3><small>${esc(r.donor)} · requested ${fmt(r.createdAt)}</small></div>${pill(r.status)}</div>
      ${r.status === "approved" && l ? `<div class="pick"><b>Pickup details</b><span>${ic("pin")} ${esc(l.location)}</span><span>${ic("clock")} Collect by ${fmt(l.deadline)} (${left(l.deadline)})</span><span>${ic("user")} Ask for ${esc(p.who || l.donor)}${p.phone || (du && du.phone) ? " · " + esc(p.phone || du.phone) : ""}</span>${p.note ? `<span>“${esc(p.note)}”</span>` : ""}</div>`
        : r.status === "pending" ? `<p class="note">Waiting for the donor to respond</p>` : r.status === "declined" ? `<p class="meta">The donor declined or the food is no longer available.</p>` : ""}
      ${["pending", "approved"].includes(r.status) ? `<div class="acts">${r.status === "approved" ? `<button class="btn btn-primary btn-sm" data-act="collect" data-id="${r.listingId}">Mark collected</button>` : ""}<button class="btn btn-danger btn-sm" data-act="cancel" data-id="${r.id}">Cancel request</button></div>` : ""}</article>`;
  };
  const T1 = () => { const list = rs.filter((r) => ["pending", "approved", "declined"].includes(r.status) && (F.rs === "all" || r.status === F.rs));
    return `<div class="chips">${chip("all", "All")}${chip("pending", "Pending")}${chip("approved", "Approved")}${chip("declined", "Declined")}</div>
      ${list.length ? `<div class="grid">${list.map(card).join("")}</div>` : empty("box", "No requests here", rs.length ? "Nothing matches this status." : "Browse available food and send your first request.", `<div class="empty-actions"><button class="btn btn-primary" data-act="tab" data-id="0">Browse food</button></div>`)}`; };
  const hist = rs.filter((r) => ["completed", "cancelled"].includes(r.status)), meals = rs.filter((r) => r.status === "completed").reduce((s, r) => { const l = lsAll().find((x) => x.id === r.listingId); return s + (l ? l.servings : 0); }, 0);
  const T2 = () => `<div class="stats"><div class="stat"><b>${rs.length}</b><span>Requests sent</span></div><div class="stat"><b>${meals}</b><span>Meals collected</span></div></div>
    <div class="box"><h2>Request history</h2>${rs.length ? `<ul class="rows">${rs.map((r) => `<li><span><b>${esc(r.food)}</b><small>${esc(r.donor)} · ${fmt(r.updatedAt || r.createdAt)}</small></span>${pill(r.status)}</li>`).join("")}</ul>` : `<p class="count">Every request you send is listed here with its outcome.</p>`}</div>`;
  const T3 = () => profileForm(u);
  return { title: "Receiver dashboard", stats: [[openFood().length, "Available now"], [cnt("pending"), "Pending"], [cnt("approved"), "Approved"], [cnt("completed"), "Collected"]],
    tabs: [["Browse food", T0], ["My requests", T1], ["History", T2], ["Profile", T3]], after: () => { if (tab === 0) fillBrowse(); } };
}

/* ---------- Profile (shared) ---------- */
const profileForm = (u) => `<form id="pf" class="box" novalidate><h2>Profile</h2>${profileOk(u) ? "" : `<p class="note">Your profile is incomplete. Fill every field to ${u.role === "donor" ? "add donations" : "send requests"}.</p>`}<p class="v-help">Signed in as ${esc(u.email)}. All fields are mandatory.</p><div class="form-grid">
  ${fld("Contact name *", "name", u.name)}${fld(u.role === "donor" ? "Restaurant or organisation *" : "NGO, hostel or community *", "org", u.org)}
  ${fld("Phone *", "phone", u.phone || "", 'inputmode="tel"', "tel")}${fld((u.role === "donor" ? "Pickup address" : "Area / city") + " *", "address", u.address || "")}</div>
  <p class="error" id="pfErr" role="alert"></p><button class="btn btn-primary">Save profile</button></form>`;
function saveProfile(f) {
  const u = me(), err = $("#pfErr");
  if (f.name.trim().length < 2 || f.org.trim().length < 2) { err.textContent = "Enter your name and organisation (at least 2 characters each)."; return; }
  if (!PH.test(f.phone.trim())) { err.textContent = "Enter a valid phone number."; return; }
  if (f.address.trim().length < 3) { err.textContent = u.role === "donor" ? "Enter your pickup address." : "Enter your area or city."; return; }
  saveUser(u.id, (x) => { x.name = f.name.trim(); x.org = f.org.trim(); x.phone = f.phone.trim(); x.address = f.address.trim(); });
  toast("Profile saved."); draw();
}

/* ---------- Dashboard shell ---------- */
let tab = 0, page = "";
const F = { ds: "all", rs: "all", q: "", cat: "all", loc: "" };
function draw() {
  sync();
  const u = me(); if (!u) { location.replace("login.html"); return; }
  if (u.role === "donor") { const a = get(K.a, null); if (a && u.acct && a.id === u.acct.id) u.acct = a; }
  const cfg = page === "donor" ? donorView(u) : recvView(u);
  $("#dh").textContent = cfg.title;
  $("#ds").textContent = page === "donor" ? "List surplus food, review requests and see the impact you make." : "Find food nearby, send requests and collect with confidence.";
  $("#stats").innerHTML = cfg.stats.map(([n, l]) => `<div class="stat"><b>${n}</b><span>${l}</span></div>`).join("");
  $("#tabs").innerHTML = cfg.tabs.map((t, i) => `<button role="tab" aria-selected="${i === tab}" data-act="tab" data-id="${i}">${t[0]}</button>`).join("");
  $("#view").innerHTML = cfg.tabs[tab][1]();
  if (cfg.after) cfg.after();
}
function boot() {
  page = document.body.dataset.page;
  if (page === "login") return loginPage();
  const u = me();
  if (!u || u.role !== page) { location.replace(u ? home(u.role) : "login.html?role=" + page); return; } // role-based access
  if (u.role === "donor") activate(u);
  $("#app").innerHTML = `<header class="dtop"><div class="container dtop-in"><a class="dbrand" href="index.html">${ic("leaf")} Food Rescue</a>
    <div class="dwho"><span>${esc(u.org || u.name)}</span><button type="button" class="btn btn-sm btn-ghost" id="out">${ic("out")} Log out</button></div></div></header>
    <section class="dhero"><div class="dorb o1" aria-hidden="true"></div><div class="dorb o2" aria-hidden="true"></div><div class="container dhero-in"><h1 id="dh"></h1><p id="ds"></p><div class="stats" id="stats"></div></div></section><main class="container dmain" id="main"><div class="tabs" role="tablist" id="tabs" aria-label="Dashboard sections"></div><section id="view" role="tabpanel"></section></main>`;
  $("#out").onclick = () => { if (u.role === "donor") activate(u); localStorage.removeItem(K.s); location.replace("login.html"); };
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-act]"); if (b && ACT[b.dataset.act]) ACT[b.dataset.act](b.dataset.id); });
  document.addEventListener("submit", (e) => { if (e.target.id === "pf") { e.preventDefault(); saveProfile(Object.fromEntries(new FormData(e.target))); } });
  document.addEventListener("input", (e) => { const k = e.target.dataset && e.target.dataset.f; if (k) { F[k] = e.target.value; fillBrowse(); } });
  window.addEventListener("storage", (e) => { if (!e.key || e.key.startsWith("foodRescue.")) draw(); });
  window.addEventListener("focus", draw);
  draw();
}
boot();
})();
