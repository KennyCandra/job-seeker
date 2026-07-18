"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const app_config_module_1 = require("./config/app-config.module");
const database_module_1 = require("./database/database.module");
const tasks_module_1 = require("./tasks/tasks.module");
const repositories_1 = require("./database/repositories");
const companies_module_1 = require("./companies/companies.module");
const jobs_module_1 = require("./jobs/jobs.module");
const filter_module_1 = require("./filter/filter.module");
const discovery_module_1 = require("./discovery/discovery.module");
const profile_module_1 = require("./profile/profile.module");
const applications_module_1 = require("./applications/applications.module");
const saved_jobs_module_1 = require("./saved-jobs/saved-jobs.module");
const documents_module_1 = require("./documents/documents.module");
const stats_module_1 = require("./stats/stats.module");
const config_module_1 = require("./config/config.module");
const shortlist_module_1 = require("./shortlist/shortlist.module");
const apply_module_1 = require("./apply/apply.module");
const compat_module_1 = require("./compat/compat.module");
const frontend_module_1 = require("./frontend.module");
const health_controller_1 = require("./health.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            app_config_module_1.AppConfigModule,
            database_module_1.DatabaseModule,
            tasks_module_1.TasksModule,
            repositories_1.RepositoriesModule,
            companies_module_1.CompaniesModule,
            jobs_module_1.JobsModule,
            filter_module_1.FilterModule,
            discovery_module_1.DiscoveryModule,
            profile_module_1.ProfileModule,
            applications_module_1.ApplicationsModule,
            saved_jobs_module_1.SavedJobsModule,
            documents_module_1.DocumentsModule,
            stats_module_1.StatsModule,
            config_module_1.ConfigModule,
            shortlist_module_1.ShortlistModule,
            apply_module_1.ApplyModule,
            compat_module_1.CompatModule,
            frontend_module_1.FrontendModule,
        ],
        controllers: [health_controller_1.HealthController],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map