import type { AtsPlatform } from "../../../shared/types";
import { LeverFetcher } from "../../../sources/adpters/lever";
import { GreenHouseFetcher } from "../../../sources/adpters/greenhouse";
import { AshbyFetcher } from "../../../sources/adpters/ashby";
import type { JobFetcher } from "../../../sources/adpters/fetch-handler";

const fetchers: Record<Exclude<AtsPlatform , "custom">, JobFetcher> = {
  lever: new LeverFetcher(),
  greenhouse: new GreenHouseFetcher(),
  ashby: new AshbyFetcher(),
};

export const detectMigrationHandler = async (companySlug: string , prevAts: AtsPlatform) => {

  const candidates = (["greenhouse", "lever", "ashby"] as const).filter((a) => a !== prevAts);

  for (const ats of candidates){
    try {
      const response = await fetchers[ats].retry(companySlug);
      console.log(response)
    } catch {
      continue
    }
  }
  return { detected: false };
};
