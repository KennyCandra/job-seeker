"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const tasks_module_1 = require("../tasks/tasks.module");
const repositories_1 = require("../database/repositories");
const config_module_1 = require("../config/config.module");
const filter_module_1 = require("./filter.module");
const filter_tasks_1 = require("./filter.tasks");
let FilterWorkerModule = class FilterWorkerModule {
};
exports.FilterWorkerModule = FilterWorkerModule;
exports.FilterWorkerModule = FilterWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tasks_module_1.TasksModule, repositories_1.RepositoriesModule, config_module_1.ConfigModule, filter_module_1.FilterModule],
        providers: [filter_tasks_1.FilterTasksService],
    })
], FilterWorkerModule);
//# sourceMappingURL=filter.worker.module.js.map