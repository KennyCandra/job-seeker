CREATE INDEX IF NOT EXISTS "idx_applications_created_desc_id" ON "applications" USING btree ("created_at" DESC, "id" DESC);
