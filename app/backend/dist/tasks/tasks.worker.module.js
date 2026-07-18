"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_module_1 = require("../queue/queue.module");
const constants_1 = require("../queue/constants");
const tasks_module_1 = require("./tasks.module");
const repositories_1 = require("../database/repositories");
const task_processor_1 = require("./task-processor");
const task_reaper_service_1 = require("./task-reaper.service");
let TasksWorkerModule = class TasksWorkerModule {
};
exports.TasksWorkerModule = TasksWorkerModule;
exports.TasksWorkerModule = TasksWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [queue_module_1.QueueCoreModule, bullmq_1.BullModule.registerQueue({ name: constants_1.TASK_QUEUE }), tasks_module_1.TasksModule, repositories_1.RepositoriesModule],
        providers: [task_processor_1.TaskProcessor, task_reaper_service_1.TaskReaperService],
    })
], TasksWorkerModule);
//# sourceMappingURL=tasks.worker.module.js.map