import { TaskHandlerContext } from "app/src/queue/types";
import { handleNormalization } from "app/src/jobs/normalize";
import { persistSyncResult } from "app/src/jobs/sync/persist";
import { classifyJobs } from "app/src/jobs/sync/classify";
import { AtsPlatform } from "@shared/types";

export const syncCompany = async (ctx: TaskHandlerContext) => {
  const { payload } = ctx;
  const {id , slug , name ,ats , boardUrl} = payload.company as {
    id: number,
    slug: string,
    name: string,
    ats: AtsPlatform,
    boardUrl: string
  };
  const response = await fetch(boardUrl);

  if(!response){
    
  };

  const parsedResponse = await response.json()

  const { inputs, rawDataByJobId } = handleNormalization(
    parsedResponse.jobs,
    ats,
    id
  );


const companySync = await classifyJobs(
    id,
    slug,
    name,
    ats,
    inputs
  );
  
  await persistSyncResult(
    companySync.newJobs,
    companySync.changedJobs,
    companySync.unchangedJobs,
    id,
    rawDataByJobId
  );

  return {
    hello: "world",
  };
};
