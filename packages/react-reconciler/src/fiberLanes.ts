import { unstable_IdlePriority, unstable_ImmediatePriority, unstable_NormalPriority, unstable_UserBlockingPriority, unstable_getCurrentPriorityLevel } from "scheduler";
import { FiberNode, FiberRootNode } from "./fiber";

export type Lane = number;
export type Lanes = number;


export const SyncLane = 0b0001;
export const InputContinuousLane = 0b0010;
export const DefaultLane = 0b0100;
export const IdletLane = 0b1000;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(LaneA: Lane, LaneB: Lane): Lanes {
    return LaneA | LaneB;
}

export function requestUpdateLane() {
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