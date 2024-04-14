"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTokensCookie = void 0;
var adapter_1 = require("hono/adapter");
var cookie_1 = require("hono/cookie");
var constants_1 = require("../constants");
function setTokensCookie(_a) {
    var _b, _c;
    var context = _a.context, access_token = _a.access_token, refresh_token = _a.refresh_token;
    (0, cookie_1.setCookie)(context, constants_1.ACCESS_TOKEN_KEY, access_token, {
        path: "/",
        httpOnly: false,
        expires: new Date(Date.now() + 1000 * 60 * 15),
        maxAge: 60 * 15,
        secure: ((_b = (0, adapter_1.env)(context)) === null || _b === void 0 ? void 0 : _b.NODE_ENV) === "production",
    });
    (0, cookie_1.setCookie)(context, constants_1.REFRESH_TOKEN_KEY, refresh_token, {
        path: "/",
        httpOnly: true,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
        maxAge: 60 * 60 * 24 * 7,
        secure: ((_c = (0, adapter_1.env)(context)) === null || _c === void 0 ? void 0 : _c.NODE_ENV) === "production",
    });
}
exports.setTokensCookie = setTokensCookie;
