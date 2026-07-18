import { AtsPlatform } from "@shared/types";
import { TaskHandlerContext } from "app/src/queue/types";
import { detectMigrationHandler } from "../../migration";

export const handleFailedQueue = async (ctx : TaskHandlerContext) => {
    const {payload} = ctx

    const {companySlug , prevAts } = payload as {
        companySlug: string;
        prevAts: AtsPlatform
    };

    const response = await detectMigrationHandler(companySlug , prevAts);

    return {
        hello: "world"
    }
};