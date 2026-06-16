export type PipelineLog = {
  type: "info" | "done" | "warn" | "error" | "accept" | "reject";
  message: string;
};

export type PipelineLogger = (log: PipelineLog) => void;

export { runDiscover } from "./runDiscover";
export { runFetchAndFilter } from "./runFetchAndFilter";
export { runDiscoverFetchFilter } from "./runDiscoverFetchFilter";