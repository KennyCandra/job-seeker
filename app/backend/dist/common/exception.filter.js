"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GlobalExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlobalExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const errors_1 = require("./errors");
let GlobalExceptionFilter = GlobalExceptionFilter_1 = class GlobalExceptionFilter {
    logger = new common_1.Logger(GlobalExceptionFilter_1.name);
    catch(exception, host) {
        const res = host.switchToHttp().getResponse();
        if (exception instanceof zod_1.ZodError) {
            res.status(common_1.HttpStatus.BAD_REQUEST).json({ error: exception.issues });
            return;
        }
        if (exception instanceof errors_1.AppException) {
            res.status(exception.status).json({ error: exception.message });
            return;
        }
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const body = exception.getResponse();
            if (typeof body === "string") {
                res.status(status).json({ error: body });
                return;
            }
            const message = body?.message || exception.message;
            res.status(status).json({ error: Array.isArray(message) ? message[0] : message });
            return;
        }
        this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
        const message = exception instanceof Error ? exception.message : "Internal server error";
        res.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({ error: message });
    }
};
exports.GlobalExceptionFilter = GlobalExceptionFilter;
exports.GlobalExceptionFilter = GlobalExceptionFilter = GlobalExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], GlobalExceptionFilter);
//# sourceMappingURL=exception.filter.js.map