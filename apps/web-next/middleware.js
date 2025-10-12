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
exports.config = void 0;
exports.middleware = middleware;
var globalForPatch = globalThis;
// Next edge runtime runs globals.ts multiple times under Turbopack/HMR, causing
// Object.defineProperty(globalThis, "__import_unsupported", ...) to throw because the
// property is non-configurable after the first definition. Patch defineProperty once
// so repeated definitions are ignored instead of crashing the middleware bootstrap.
if (typeof EdgeRuntime === "string" &&
    !globalForPatch.__importUnsupportedPatched) {
    var originalDefineProperty_1 = Object.defineProperty;
    Object.defineProperty = function definePropertyPatched(target, property, attributes) {
        if (target === globalThis &&
            property === "__import_unsupported" &&
            Object.prototype.hasOwnProperty.call(globalThis, "__import_unsupported")) {
            return target;
        }
        return originalDefineProperty_1(target, property, attributes);
    };
    globalForPatch.__importUnsupportedPatched = true;
}
var server_1 = require("next/server");
var middleware_1 = require("@/utils/supabase/middleware");
var RAW_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    "";
var SUPABASE_COOKIE_PREFIX = (function () {
    var match = RAW_SUPABASE_URL.match(/^https?:\/\/([^.\s]+)\.supabase\.co/i);
    return match ? "sb-".concat(match[1]) : null;
})();
var STATIC_COOKIE_NAMES = new Set([
    "sb-access-token",
    "sb-refresh-token",
    "sb:token",
    "supabase-auth-token",
    "supabase-session",
]);
function isSupabaseCookie(name) {
    if (!name)
        return false;
    if (STATIC_COOKIE_NAMES.has(name))
        return true;
    if (name.startsWith("sb-") && /-(access|refresh|auth)-token$/.test(name)) {
        return true;
    }
    if (SUPABASE_COOKIE_PREFIX) {
        if (name.startsWith("".concat(SUPABASE_COOKIE_PREFIX, "-")) &&
            /-(access|refresh|auth)-token$/.test(name)) {
            return true;
        }
    }
    return false;
}
function hasAuthCookie(req, res) {
    var _a, _b, _c, _d, _e, _f;
    // ????????? ? ??????, ? (?? ?????? ??????) ????? ????? updateSession -
    // ????? helper ??? ??????? ????
    var reqCookies = (_c = (_b = (_a = req.cookies).getAll) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : [];
    if (reqCookies.some(function (cookie) { return isSupabaseCookie(cookie.name); })) {
        return true;
    }
    if (res) {
        var resCookies = (_f = (_e = (_d = res.cookies).getAll) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : [];
        if (resCookies.some(function (cookie) { return isSupabaseCookie(cookie.name); })) {
            return true;
        }
    }
    return false;
}
function requiresAuth(pathname) {
    // ???????? ???? ????????? ???? ??? ?????????????
    // ???????? ????????? ?????? ? /checkout ??? ???????????, ????? ?? ??????????? ??????
    return pathname.startsWith("/account");
}
function middleware(request) {
    return __awaiter(this, void 0, void 0, function () {
        var response, _a, pathname, search, isAuthed, url, redirectTo;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, middleware_1.updateSession)(request)];
                case 1:
                    response = _b.sent();
                    _a = request.nextUrl, pathname = _a.pathname, search = _a.search;
                    // 2) ?????????? ????-????? (?????, ????????? API ? ?.?.)
                    if (pathname.startsWith("/login") ||
                        pathname.startsWith("/api/public") ||
                        pathname === "/") {
                        return [2 /*return*/, response];
                    }
                    // 3) ???? ??? ?????????? ???? - ????? ???????????
                    if (requiresAuth(pathname)) {
                        isAuthed = hasAuthCookie(request, response);
                        if (!isAuthed) {
                            url = new URL("/login", request.url);
                            redirectTo = pathname + (search || "");
                            url.searchParams.set("redirect", redirectTo);
                            return [2 /*return*/, server_1.NextResponse.redirect(url)];
                        }
                    }
                    // 4) ????? - ??? ??????
                    return [2 /*return*/, response];
            }
        });
    });
}
/**
 * ?????? ??????? ??? ? ????: ?????????? ???????, ??????????? ???????? ? favicons.
 * ??? ??????? ????? ????????? ?????????? (????????, /health, /sitemap.xml ? ?.?.)
 */
exports.config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
    runtime: "nodejs",
};
