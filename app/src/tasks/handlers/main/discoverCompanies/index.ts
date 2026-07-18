import type { HandlerFn } from "../../../handler";
import { runDiscover } from "../../../../pipeline";

export const discoverCompaniesHandler: HandlerFn = async (ctx) => {
  const { log, throwIfCancelled } = ctx;
  await throwIfCancelled();
  const result = await runDiscover((pl) => {
    log("info", `[discovery] ${pl.type}: ${pl.message}`);
  });
  await throwIfCancelled();
  return {
    source: result.source,
    found: result.found,
    added: result.added,
    updated: result.updated,
    queries: result.queries,
    companies: result.companies.length,
  };
};
