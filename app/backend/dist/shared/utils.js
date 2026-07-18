"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readText = readText;
exports.writeText = writeText;
exports.writeJson = writeJson;
exports.readJson = readJson;
const fs_1 = require("fs");
function readText(path) {
    return (0, fs_1.readFileSync)(path, "utf-8");
}
function writeText(path, content) {
    (0, fs_1.mkdirSync)(dirname(path), { recursive: true });
    (0, fs_1.writeFileSync)(path, content, "utf-8");
}
function writeJson(path, data) {
    writeText(path, JSON.stringify(data, null, 2));
}
function readJson(path, fallback) {
    if (!(0, fs_1.existsSync)(path))
        return fallback;
    try {
        return JSON.parse((0, fs_1.readFileSync)(path, "utf-8"));
    }
    catch {
        return fallback;
    }
}
function dirname(p) {
    const i = p.lastIndexOf("/");
    return i === -1 ? "." : p.slice(0, i);
}
//# sourceMappingURL=utils.js.map