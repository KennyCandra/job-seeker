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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationRunStep = void 0;
const typeorm_1 = require("typeorm");
let ApplicationRunStep = class ApplicationRunStep {
    id;
    runId;
    run;
    type;
    label;
    detail;
    screenshotPath;
    payload;
    createdAt;
};
exports.ApplicationRunStep = ApplicationRunStep;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "run_id", type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("ApplicationRun", (run) => run.steps, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "run_id" }),
    __metadata("design:type", Function)
], ApplicationRunStep.prototype, "run", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "detail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "screenshot_path", type: "text", nullable: true }),
    __metadata("design:type", Object)
], ApplicationRunStep.prototype, "screenshotPath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "payload", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRunStep.prototype, "createdAt", void 0);
exports.ApplicationRunStep = ApplicationRunStep = __decorate([
    (0, typeorm_1.Entity)("application_run_steps"),
    (0, typeorm_1.Index)("idx_app_run_steps_run", ["runId"]),
    (0, typeorm_1.Index)("idx_app_run_steps_run_created", ["runId", "createdAt"])
], ApplicationRunStep);
//# sourceMappingURL=application-run-step.entity.js.map