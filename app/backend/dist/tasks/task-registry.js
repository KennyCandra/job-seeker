"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TaskRegistry_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRegistry = void 0;
const common_1 = require("@nestjs/common");
let TaskRegistry = TaskRegistry_1 = class TaskRegistry {
    handlers = new Map();
    logger = new common_1.Logger(TaskRegistry_1.name);
    register(type, fn) {
        this.handlers.set(type, fn);
        this.logger.log(`Registered task handler: ${type}`);
    }
    get(type) {
        return this.handlers.get(type);
    }
    has(type) {
        return this.handlers.has(type);
    }
};
exports.TaskRegistry = TaskRegistry;
exports.TaskRegistry = TaskRegistry = TaskRegistry_1 = __decorate([
    (0, common_1.Injectable)()
], TaskRegistry);
//# sourceMappingURL=task-registry.js.map