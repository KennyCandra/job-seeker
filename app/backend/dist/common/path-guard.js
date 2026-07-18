"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.join = void 0;
exports.resolveContainedPath = resolveContainedPath;
exports.ensureContained = ensureContained;
const path_1 = require("path");
Object.defineProperty(exports, "join", { enumerable: true, get: function () { return path_1.join; } });
const errors_1 = require("./errors");
function resolveContainedPath(baseDir, target) {
    let resolved;
    if ((0, path_1.isAbsolute)(target)) {
        resolved = target;
    }
    else {
        resolved = (0, path_1.resolve)(baseDir, target);
    }
    const relativePath = (0, path_1.relative)(baseDir, resolved);
    if (relativePath === "")
        return resolved;
    if (relativePath.startsWith("..") || (0, path_1.isAbsolute)(relativePath)) {
        return null;
    }
    return resolved;
}
function ensureContained(baseDir, target) {
    const resolved = resolveContainedPath(baseDir, target);
    if (!resolved) {
        throw new errors_1.AppException(403, "Invalid path");
    }
    return resolved;
}
//# sourceMappingURL=path-guard.js.map