import { SyncQueue } from "app/src/queue/SyncQueue";
import { companies } from "../../../../db";

export const syncAllCompanies = async () => {
  const allCompanies = await companies.instance.getActive();

  for (const compnay of allCompanies){
    await SyncQueue.add("data" , {compnay: compnay , type : "syncOneCompany"})
  }
  
  return {
    jobsQueued: allCompanies.length,
  };
};
