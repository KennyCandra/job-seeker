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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ApplyControlService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyControlService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
const APPLY_CONTROL_CHANNEL = "apply-control";
let ApplyControlService = ApplyControlService_1 = class ApplyControlService {
    config;
    logger = new common_1.Logger(ApplyControlService_1.name);
    publisher;
    subscriber = null;
    handlers = new Map();
    constructor(config) {
        this.config = config;
        this.publisher = new ioredis_1.default(this.config.get("REDIS_URL", { infer: true }), {
            maxRetriesPerRequest: null,
            lazyConnect: true,
        });
    }
    async publish(message) {
        await this.publisher.publish(APPLY_CONTROL_CHANNEL, JSON.stringify(message));
    }
    onControl(runId, handler) {
        this.ensureSubscribed();
        this.handlers.set(runId, handler);
    }
    offControl(runId) {
        this.handlers.delete(runId);
    }
    ensureSubscribed() {
        if (this.subscriber)
            return;
        this.subscriber = this.publisher.duplicate();
        this.subscriber.subscribe(APPLY_CONTROL_CHANNEL).catch((err) => {
            this.logger.error(`Failed to subscribe to ${APPLY_CONTROL_CHANNEL}: ${err.message}`);
        });
        this.subscriber.on("message", (_channel, raw) => {
            let message;
            try {
                message = JSON.parse(raw);
            }
            catch (err) {
                this.logger.error(`Bad apply-control message: ${err?.message ?? err}`);
                return;
            }
            const handler = this.handlers.get(message.runId);
            if (handler)
                handler(message.action);
        });
    }
    async onModuleDestroy() {
        await this.publisher.quit().catch(() => { });
        await this.subscriber?.quit().catch(() => { });
    }
};
exports.ApplyControlService = ApplyControlService;
exports.ApplyControlService = ApplyControlService = ApplyControlService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ApplyControlService);
//# sourceMappingURL=apply-control.service.js.map