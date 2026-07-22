"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const config_1 = require("@nestjs/config");
const entities_1 = require("./entities");
const repositories_1 = require("./repositories");
let DatabaseModule = class DatabaseModule {
};
exports.DatabaseModule = DatabaseModule;
exports.DatabaseModule = DatabaseModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: "postgres",
                    url: config.get("DATABASE_URL", { infer: true }),
                    entities: [
                        entities_1.Company,
                        entities_1.Job,
                        entities_1.JobFilterEntity,
                        entities_1.Application,
                        entities_1.ApplicationRun,
                        entities_1.ApplicationRunStep,
                        entities_1.JobDocument,
                        entities_1.SearchConfigEntity,
                        entities_1.TaskRun,
                        entities_1.TaskRunLog,
                        entities_1.UserProfile,
                        entities_1.UserAnswer,
                        entities_1.CompanySnapshot,
                    ],
                    synchronize: false,
                    extra: {
                        max: config.get("DATABASE_POOL_SIZE", { infer: true }),
                    },
                }),
            }),
            repositories_1.RepositoriesModule,
        ],
        exports: [repositories_1.RepositoriesModule],
    })
], DatabaseModule);
//# sourceMappingURL=database.module.js.map