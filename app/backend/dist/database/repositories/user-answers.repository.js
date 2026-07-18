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
exports.UserAnswersRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let UserAnswersRepository = class UserAnswersRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getAll() {
        const rows = await this.dataSource.query(`SELECT id, category, question, answer, tags_json AS "tagsJson", created_at AS "createdAt", updated_at AS "updatedAt" FROM user_answers ORDER BY created_at DESC, id ASC`);
        return rows;
    }
    async getById(id) {
        const rows = await this.dataSource.query(`SELECT id, category, question, answer, tags_json AS "tagsJson", created_at AS "createdAt", updated_at AS "updatedAt" FROM user_answers WHERE id = $1 LIMIT 1`, [id]);
        return rows[0];
    }
    async create(input) {
        const id = `answer_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date().toISOString();
        await this.dataSource.query(`INSERT INTO user_answers (id, category, question, answer, tags_json, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $6)`, [id, input.category, input.question, input.answer, input.tagsJson ?? "[]", now]);
        return id;
    }
    async update(id, data) {
        const sets = ["updated_at = $2"];
        const params = [id, new Date().toISOString()];
        let i = 3;
        for (const [k, v] of Object.entries(data)) {
            sets.push(`${toSnake(k)} = $${i++}`);
            params.push(v);
        }
        await this.dataSource.query(`UPDATE user_answers SET ${sets.join(", ")} WHERE id = $1`, params);
    }
    async delete(id) {
        await this.dataSource.query(`DELETE FROM user_answers WHERE id = $1`, [id]);
    }
};
exports.UserAnswersRepository = UserAnswersRepository;
exports.UserAnswersRepository = UserAnswersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], UserAnswersRepository);
function toSnake(k) {
    return k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
//# sourceMappingURL=user-answers.repository.js.map