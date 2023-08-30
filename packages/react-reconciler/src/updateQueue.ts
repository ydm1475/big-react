import { Action } from "shared/ReactTypes";
import { Lane, NoLane, isSubsetOfLanes } from "./fiberLanes";

export interface Update<State> {
    action: Action<State>,
    lane: Lane,
    next: Update<any> | null
}

export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null
    },
    dispatch: any,
    reducer: any

}

export const createUpdate = <State>(action: Action<State>, lane: Lane) => {
    return { action, lane, next: null };
}

export const createUpdateQueue = <State>() => {
    return {
        shared: {
            pending: null
        },
        dispatch: null,
        reducer: null
    } as UpdateQueue<State>
}

export const enqueueUpdate = <State>(updateQueue: UpdateQueue<State>, update: Update<State>) => {
    const pending = updateQueue.shared.pending;
    if (pending == null) {
        update.next = update;
    } else {
        update.next = pending.next;
        pending.next = update;
    }

    updateQueue.shared.pending = update;
}


// 消费
export const processUpdateQueue = <State>(
    baseState: State,
    pendingUpdate: Update<State> | null,
    renderLane: Lane,
    reducer?: any
): { memoizedState: State, baseState: State, baseQueue: Update<State> | null } => {

    const result: ReturnType<typeof processUpdateQueue<State>> = {
        memoizedState: baseState,
        baseState,
        baseQueue: null
    }

    if (pendingUpdate != null) {
        // 第一个update
        const first = pendingUpdate.next;
        let pending = pendingUpdate.next;
        let newBaseState = baseState;
        let newBaseQueueFirst: Update<State> | null = null;
        let newBaseQueueLast: Update<State> | null = null;
        let newState = baseState;

        do {
            const updateLane = pending?.lane;

            if (isSubsetOfLanes(renderLane, updateLane!)) {
                // 优先级足够
                if (newBaseQueueLast != null) {
                    const clone = createUpdate(pending?.action, NoLane);
                    newBaseQueueLast.next = clone;
                    newBaseQueueLast = clone;
                }
                const action = pending!.action;
                if (reducer instanceof Function) {
                    newState = reducer(baseState, action);
                } else if (action instanceof Function) {
                    newState = action(baseState);
                } else {
                    newState = action;
                }
            } else {
                //优先级不够 被跳过
                const clone = createUpdate(pending?.action, updateLane!);
                // 是不是第一个被跳过的update
                if (newBaseQueueFirst === null) {
                    newBaseQueueFirst = clone;
                    newBaseQueueLast = clone;
                    newBaseState = newState;
                } else {
                    (newBaseQueueLast as Update<State>).next = clone;
                    newBaseQueueLast = clone;
                }
            }
            pending = pending?.next as Update<any>;

        } while (pending !== first);

        if (newBaseQueueLast === null) {
            // 本次计算没有update被跳过
            newBaseState = newState;

        } else {
            newBaseQueueLast.next = newBaseQueueFirst;

        }
        result.baseQueue = newBaseQueueLast;
        result.baseState = newBaseState;
        result.memoizedState = newState;
    }
    return result;
}