export type CatchUpAction = "full" | "smart-only" | "none";
type CompletedRunLike = {
    completedAt: string | null;
    resultJson: string | null;
};
export declare function decideCatchUp(runs: CompletedRunLike[], now: Date, catchupHours: number): CatchUpAction;
export {};
