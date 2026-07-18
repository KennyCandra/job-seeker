"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsModule = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
const generator_service_1 = require("./generator.service");
const latex_service_1 = require("./latex.service");
const documents_controller_1 = require("./documents.controller");
let DocumentsModule = class DocumentsModule {
};
exports.DocumentsModule = DocumentsModule;
exports.DocumentsModule = DocumentsModule = __decorate([
    (0, common_1.Module)({
        imports: [repositories_1.RepositoriesModule],
        controllers: [documents_controller_1.DocumentsController],
        providers: [generator_service_1.GeneratorService, latex_service_1.LatexService],
        exports: [generator_service_1.GeneratorService, latex_service_1.LatexService],
    })
], DocumentsModule);
//# sourceMappingURL=documents.module.js.map