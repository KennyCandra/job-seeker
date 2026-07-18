"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZodValidationPipe = void 0;
const common_1 = require("@nestjs/common");
class ZodValidationPipe {
    schema;
    constructor(schema) {
        this.schema = schema;
    }
    transform(value, metadata) {
        if (!this.schema)
            return value;
        const result = this.schema.safeParse(value);
        if (!result.success) {
            throw new common_1.BadRequestException(result.error.issues);
        }
        return result.data;
    }
}
exports.ZodValidationPipe = ZodValidationPipe;
//# sourceMappingURL=validation.pipe.js.map