"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_module_1 = require("../queue/queue.module");
const constants_1 = require("../queue/constants");
const repositories_1 = require("../database/repositories");
const apply_processor_1 = require("./apply.processor");
const apply_control_service_1 = require("./apply-control.service");
let ApplyWorkerModule = class ApplyWorkerModule {
};
exports.ApplyWorkerModule = ApplyWorkerModule;
exports.ApplyWorkerModule = ApplyWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [queue_module_1.QueueCoreModule, bullmq_1.BullModule.registerQueue({ name: constants_1.APPLY_QUEUE }), repositories_1.RepositoriesModule],
        providers: [apply_processor_1.ApplyProcessor, apply_control_service_1.ApplyControlService],
    })
], ApplyWorkerModule);
//# sourceMappingURL=apply.worker.module.js.map