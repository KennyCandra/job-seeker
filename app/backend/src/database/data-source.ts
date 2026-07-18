import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import * as entities from "../database/entities";

const entityList: any[] = Object.values(entities).filter((e) => typeof e === "function");

export const AppDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: entityList,
  migrations: [__dirname + "/migrations/*{.ts,.js}"],
  synchronize: false,
  migrationsRun: false,
  extra: {
    max: env.DATABASE_POOL_SIZE,
    connectionTimeoutMillis: 10000,
  },
});

export function createDataSource(url?: string): DataSource {
  if (!url || url === env.DATABASE_URL) return AppDataSource;
  return new DataSource({
    type: "postgres",
    url,
    entities: entityList,
    synchronize: false,
    migrationsRun: false,
  });
}
