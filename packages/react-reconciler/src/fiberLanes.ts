import { unstable_IdlePriority, unstable_ImmediatePriority, unstable_NormalPriority, unstable_UserBlockingPriority, unstable_getCurrentPriorityLevel } from "scheduler";
import { FiberNode, FiberRootNode } from "./fiber";
import ReactCurrentBatchConfig from "react/src/currentBatchConfig";

export type Lane = number;
export type Lanes = number;


export const SyncLane = 0b00001;
export const InputContinuousLane = 0b00010;
export const DefaultLane = 0b00100;
export const TransitionLane = 0b01000;
export const IdletLane = 0b10000;
export const NoLane = 0b00000;
export const NoLanes = 0b00000;

export function mergeLanes(LaneA: Lane, LaneB: Lane): Lanes {
    return LaneA | LaneB;
}

export function requestUpdateLane() {

    const isTransition = ReactCurrentBatchConfig.transition;
    if (isTransition) {
        return TransitionLane;
    }
    // 从上下文环境中获取优先级
    const currentPriorityLevel = unstable_getCurrentPriorityLevel();
    const lane = schedulerPriorityToLane(currentPriorityLevel);
    return lane;
}

export function getHighestPriorityLane(lanes: Lanes): Lane {
    return lanes & -lanes;
}

export function markRootFinshed(root: FiberRootNode, lane: Lane) {
    root.pendingLanes &= ~lane;
}

export function isSubsetOfLanes(set: Lanes, subset: Lane) {
    return (set & subset) === subset;
}


export function lanesToSchedulerPriority(lanes: Lanes) {
    const lane = getHighestPriorityLane(lanes);

    if (lane == SyncLane) {
        return unstable_ImmediatePriority;
    }

    if (lane === InputContinuousLane) {
        return unstable_UserBlockingPriority;
    }

    if (lane === DefaultLane) {
        return unstable_NormalPriority;
    }

    return unstable_IdlePriority;
}



export function schedulerPriorityToLane(schedulerPriority: number) {
    if (schedulerPriority === unstable_ImmediatePriority) {
        return SyncLane;
    }

    if (schedulerPriority === unstable_UserBlockingPriority) {
        return InputContinuousLane;
    }
    if (schedulerPriority === unstable_NormalPriority) {
        return DefaultLane;
    }

    return NoLane;
}