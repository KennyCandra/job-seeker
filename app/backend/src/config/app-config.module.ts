import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { env as config } from "./env";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [() => config],
      envFilePath: [".env", ".env.local"],
    }),
  ],
  exports: [NestConfigModule],
})
export class AppConfigModule {}
