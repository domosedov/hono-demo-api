"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJwtPayload = void 0;
var getJwtPayload = function (_a) {
    var context = _a.context;
    return context.get("jwtPayload");
};
exports.getJwtPayload = getJwtPayload;
