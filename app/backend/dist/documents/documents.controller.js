"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsController = void 0;
const common_1 = require("@nestjs/common");
const generator_service_1 = require("./generator.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
let DocumentsController = class DocumentsController {
    generator;
    constructor(generator) {
        this.generator = generator;
    }
    list(jobId) {
        return this.generator.list(jobId);
    }
    async generate(jobId, body) {
        const result = await this.generator.generate(jobId, body.type, Boolean(body.force));
        return { ok: true, jobId, type: body.type, ...result };
    }
    async download(jobId, documentId, res) {
        const file = await this.generator.download(jobId, documentId);
        res.setHeader("Content-Type", file.contentType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
        res.download(file.filePath, file.fileName);
    }
};
exports.DocumentsController = DocumentsController;
__decorate([
    (0, common_1.Get)(":jobId/documents"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], DocumentsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(":jobId/documents"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.generateDocumentSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(":jobId/documents/:documentId/download"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Param)("documentId")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], DocumentsController.prototype, "download", null);
exports.DocumentsController = DocumentsController = __decorate([
    (0, common_1.Controller)("jobs"),
    __metadata("design:paramtypes", [generator_service_1.GeneratorService])
], DocumentsController);
//# sourceMappingURL=documents.controller.js.map