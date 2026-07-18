"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompatModule = void 0;
const common_1 = require("@nestjs/common");
const compat_controller_1 = require("./compat.controller");
const documents_module_1 = require("../documents/documents.module");
const tasks_module_1 = require("../tasks/tasks.module");
let CompatModule = class CompatModule {
};
exports.CompatModule = CompatModule;
exports.CompatModule = CompatModule = __decorate([
    (0, common_1.Module)({
        imports: [documents_module_1.DocumentsModule, tasks_module_1.TasksModule],
        controllers: [compat_controller_1.JobExtractController, compat_controller_1.CvController, compat_controller_1.PipelineController],
    })
], CompatModule);
//# sourceMappingURL=compat.module.js.map