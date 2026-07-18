"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsWorkerModule = void 0;
const common_1 = require("@nestjs/common");
const tasks_module_1 = require("../tasks/tasks.module");
const repositories_1 = require("../database/repositories");
const filter_module_1 = require("../filter/filter.module");
const applications_module_1 = require("./applications.module");
const applications_service_1 = require("./applications.service");
let ApplicationsWorkerModule = class ApplicationsWorkerModule {
};
exports.ApplicationsWorkerModule = ApplicationsWorkerModule;
exports.ApplicationsWorkerModule = ApplicationsWorkerModule = __decorate([
    (0, common_1.Module)({
        imports: [tasks_module_1.TasksModule, repositories_1.RepositoriesModule, filter_module_1.FilterModule, applications_module_1.ApplicationsModule],
        providers: [applications_service_1.ApplicationsTasksService],
    })
], ApplicationsWorkerModule);
//# sourceMappingURL=applications.worker.module.js.map