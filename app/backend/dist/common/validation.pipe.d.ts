import { PipeTransform, ArgumentMetadata } from "@nestjs/common";
import type { ZodSchema } from "zod";
export declare class ZodValidationPipe implements PipeTransform {
    private readonly schema?;
    constructor(schema?: ZodSchema | undefined);
    transform(value: unknown, metadata: ArgumentMetadata): unknown;
}
