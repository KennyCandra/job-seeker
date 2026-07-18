"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
exports.createDataSource = createDataSource;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const env_1 = require("../config/env");
const entities = __importStar(require("../database/entities"));
const entityList = Object.values(entities).filter((e) => typeof e === "function");
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    url: env_1.env.DATABASE_URL,
    entities: entityList,
    migrations: [__dirname + "/migrations/*{.ts,.js}"],
    synchronize: false,
    migrationsRun: false,
    extra: {
        max: env_1.env.DATABASE_POOL_SIZE,
        connectionTimeoutMillis: 10000,
    },
});
function createDataSource(url) {
    if (!url || url === env_1.env.DATABASE_URL)
        return exports.AppDataSource;
    return new typeorm_1.DataSource({
        type: "postgres",
        url,
        entities: entityList,
        synchronize: false,
        migrationsRun: false,
    });
}
//# sourceMappingURL=data-source.js.map