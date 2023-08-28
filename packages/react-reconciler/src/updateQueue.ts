import { Action } from "shared/ReactTypes";

export interface Update<State> {
    action: Action<State>
}

export interface UpdateQueue<State> {
    shared: {
        pending: Update<State> | null
    },
    dispatch: any

}

export const createUpdate = <State>(action: Action<State>) => {
    return { action };
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
    updateQueue.shared.pending = update
}


// 消费
export const processUpdateQueue = <State>(baseState: State, pendingUpdate: Update<State> | null): { memoizedState: State } => {

    const result: ReturnType<typeof processUpdateQueue<State>> = {
        memoizedState: baseState
    }

    if (pendingUpdate != null) {
        const action = pendingUpdate.action;
        if (action instanceof Function) {
            result.memoizedState = action(baseState);
        } else {
            result.memoizedState = action;
        }

    }
    return result;
}