import type { MigrationInterface, QueryRunner } from "typeorm";

export class CompanySnapshots1784500000000 implements MigrationInterface {
  name = "CompanySnapshots1784500000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "company_snapshots" (
      "id" BIGSERIAL PRIMARY KEY,
      "company_id" integer NOT NULL,
      "snapshot_date" text NOT NULL,
      "open_count" integer NOT NULL DEFAULT 0,
      "new_count" integer NOT NULL DEFAULT 0,
      "closed_count" integer NOT NULL DEFAULT 0,
      "created_at" text NOT NULL,
      CONSTRAINT "uq_company_snapshots_company_date" UNIQUE ("company_id", "snapshot_date")
    )`);
    await queryRunner.query(
      `CREATE INDEX "idx_company_snapshots_date" ON "company_snapshots" ("snapshot_date")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "company_snapshots"`);
  }
}
