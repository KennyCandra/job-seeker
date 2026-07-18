"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_module_1 = require("../queue/queue.module");
const constants_1 = require("../queue/constants");
const task_registry_1 = require("./task-registry");
const task_queue_service_1 = require("./task-queue.service");
const sse_service_1 = require("./sse.service");
const task_runs_service_1 = require("./task-runs.service");
const tasks_controller_1 = require("./tasks.controller");
let TasksModule = class TasksModule {
};
exports.TasksModule = TasksModule;
exports.TasksModule = TasksModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [queue_module_1.QueueCoreModule, bullmq_1.BullModule.registerQueue({ name: constants_1.TASK_QUEUE })],
        controllers: [tasks_controller_1.TasksController],
        providers: [task_registry_1.TaskRegistry, task_queue_service_1.TaskQueueService, sse_service_1.TasksSseService, task_runs_service_1.TaskRunsService],
        exports: [task_registry_1.TaskRegistry, task_queue_service_1.TaskQueueService, sse_service_1.TasksSseService, task_runs_service_1.TaskRunsService],
    })
], TasksModule);
//# sourceMappingURL=tasks.module.js.map