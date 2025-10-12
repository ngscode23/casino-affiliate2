"use client";
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CheckoutPage;
var react_1 = require("react");
var link_1 = require("next/link");
var navigation_1 = require("next/navigation");
var cart_1 = require("@shared/ecom/lib/cart");
var client_1 = require("@shared/ecom/api/client");
var auth_1 = require("@shared/lib/auth");
function formatPrice(value, currency) {
    var _a, _b;
    if (currency === void 0) { currency = "USD"; }
    try {
        return new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: currency,
            currencyDisplay: "narrowSymbol",
            maximumFractionDigits: 2,
        }).format(value !== null && value !== void 0 ? value : 0);
    }
    catch (_c) {
        return "".concat((_b = (_a = value === null || value === void 0 ? void 0 : value.toFixed) === null || _a === void 0 ? void 0 : _a.call(value, 2)) !== null && _b !== void 0 ? _b : "0.00", " ").concat(currency);
    }
}
var uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function CheckoutPage() {
    var router = (0, navigation_1.useRouter)();
    var _a = (0, cart_1.useCart)(), items = _a.items, subtotal = _a.subtotal, clear = _a.clear;
    var _b = (0, react_1.useState)(null), error = _b[0], setError = _b[1];
    var _c = (0, react_1.useState)(false), isSubmitting = _c[0], setIsSubmitting = _c[1];
    var empty = items.length === 0;
    function handleSubmit(event) {
        return __awaiter(this, void 0, void 0, function () {
            var token, mapped, payload, err_1, message;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        event.preventDefault();
                        if (!items.length || isSubmitting)
                            return [2 /*return*/];
                        setError(null);
                        setIsSubmitting(true);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, 6, 7]);
                        return [4 /*yield*/, (0, auth_1.getValidAccessToken)()];
                    case 2:
                        token = _a.sent();
                        if (!token) {
                            router.replace("/login?redirect=".concat(encodeURIComponent("/checkout")));
                            return [2 /*return*/];
                        }
                        return [4 /*yield*/, Promise.all(items.map(function (row) { return __awaiter(_this, void 0, void 0, function () {
                                var rawId, slug, prod;
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            rawId = String(row.product.id || row.id || "");
                                            if (uuidPattern.test(rawId)) {
                                                return [2 /*return*/, { id: rawId, qty: row.qty }];
                                            }
                                            slug = String(row.product.slug || "");
                                            if (!slug)
                                                return [2 /*return*/, null];
                                            return [4 /*yield*/, (0, client_1.getProductBySlug)(slug)];
                                        case 1:
                                            prod = _a.sent();
                                            if (prod && uuidPattern.test(prod.id)) {
                                                return [2 /*return*/, { id: prod.id, qty: row.qty }];
                                            }
                                            return [2 /*return*/, null];
                                    }
                                });
                            }); }))];
                    case 3:
                        mapped = _a.sent();
                        payload = mapped.filter(function (entry) { return Boolean(entry); });
                        if (!payload.length) {
                            throw new Error("Could not match cart items with products. Please refresh and try again.");
                        }
                        return [4 /*yield*/, (0, client_1.placeOrder)(payload, "EUR")];
                    case 4:
                        _a.sent();
                        clear();
                        router.push("/account/orders");
                        return [3 /*break*/, 7];
                    case 5:
                        err_1 = _a.sent();
                        message = err_1 instanceof Error ? err_1.message : "Failed to place order.";
                        if (message.toLowerCase().includes("not authenticated")) {
                            router.replace("/login?redirect=".concat(encodeURIComponent("/checkout")));
                            return [2 /*return*/];
                        }
                        setError(message);
                        return [3 /*break*/, 7];
                    case 6:
                        setIsSubmitting(false);
                        return [7 /*endfinally*/];
                    case 7: return [2 /*return*/];
                }
            });
        });
    }
    return (<div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">Checkout</h1>
          <p className="text-sm text-neutral-600">Confirm your details and place the order securely.</p>
        </div>
        <link_1.default href="/cart" className="text-sm text-blue-600 transition hover:text-blue-500">
          Back to cart
        </link_1.default>
      </div>

      {empty ? (<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-neutral-600">Your cart is empty. Add items before checking out.</p>
          <link_1.default href="/products" className="mt-3 inline-flex text-sm text-blue-600 hover:underline">
            Explore products
          </link_1.default>
        </div>) : (<div className="grid gap-6 md:grid-cols-3">
          <form className="space-y-5 md:col-span-2" onSubmit={handleSubmit} noValidate>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Contact</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Full name
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="fullName" placeholder="Ada Lovelace" autoComplete="name" required disabled={isSubmitting}/>
              </label>
              <label className="grid gap-2 text-sm text-neutral-600">
                Email
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" type="email" name="email" placeholder="you@example.com" autoComplete="email" required disabled={isSubmitting}/>
              </label>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-lg font-semibold text-slate-900">Shipping</div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Address
                <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="address" placeholder="123 Main Street" autoComplete="street-address" required disabled={isSubmitting}/>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm text-neutral-600">
                  City
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="city" autoComplete="address-level2" required disabled={isSubmitting}/>
                </label>
                <label className="grid gap-2 text-sm text-neutral-600">
                  Postal code
                  <input className="h-11 rounded-lg border border-slate-200 px-3 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="zip" autoComplete="postal-code" required disabled={isSubmitting}/>
                </label>
              </div>
              <label className="grid gap-2 text-sm text-neutral-600">
                Notes (optional)
                <textarea className="min-h-[120px] rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200" name="notes" placeholder="Delivery instructions" disabled={isSubmitting}/>
              </label>
            </section>

            <button type="submit" className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-900 px-6 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
              {isSubmitting ? "Placing order..." : "Place order"}
            </button>
          </form>

          <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-lg font-semibold text-slate-900">Summary</div>
            <ul className="space-y-3">
              {items.map(function (row) { return (<li key={row.id} className="flex items-start justify-between gap-3 text-sm text-neutral-600">
                  <span className="flex-1 truncate" title={row.product.title}>
                    {row.product.title} x {row.qty}
                  </span>
                  <span className="text-right font-medium text-slate-900">{formatPrice(row.lineTotal)}</span>
                </li>); })}
            </ul>
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-sm text-neutral-600">
              <span>Subtotal</span>
              <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-neutral-500">Taxes and shipping are calculated at fulfillment.</p>
            {error ? <p className="text-sm text-rose-500">{error}</p> : null}
          </aside>
        </div>)}
    </div>);
}
