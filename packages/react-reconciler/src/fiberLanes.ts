import { FiberNode, FiberRootNode } from "./fiber";

export type Lane = number;
export type Lanes = number;


export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(LaneA: Lane, LaneB: Lane): Lanes {
    return LaneA | LaneB;
}

export function requestUpdateLane() {
    return SyncLane;
}

export function getHighesPriorityLane(lanes: Lanes): Lane {
    return lanes & -lanes;
}

export function markRootFinshed(root: FiberRootNode, lane: Lane) {
    root.pendingLanes &= ~lane;
}