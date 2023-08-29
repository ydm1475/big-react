import { Action } from "shared/ReactTypes";
import { Lane } from "./fiberLanes";

export interface Update<State> {
    action: Action<State>,
    lane: Lane,
    next: Update<any> | null
}

export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null
    },
    dispatch: any

}

export const createUpdate = <State>(action: Action<State>, lane: Lane) => {
    return { action, lane, next: null };
}

export const createUpdateQueue = <State>() => {
    return {
        shared: {
            pending: null
        },
        dispatch: null
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
    renderLane: Lane
): { memoizedState: State } => {

    const result: ReturnType<typeof processUpdateQueue<State>> = {
        memoizedState: baseState
    }

    if (pendingUpdate != null) {
        // 第一个update
        const first = pendingUpdate.next;
        let pending = pendingUpdate.next;
        do {
            const updateLane = pending?.lane;

            if (updateLane === renderLane) {
                const action = pending!.action;
                if (action instanceof Function) {
                    baseState = action(baseState);
                } else {
                    baseState = action;
                }
            } else {
                if (__DEV__) {
                    console.warn('不应该进入')
                }
            }
            pending = pending?.next as Update<any>;

        } while (pending !== first);

        result.memoizedState = baseState;
    }
    return result;
}