import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatcher } from "react/src/currentDispatcher";
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Dispatch } from "react/src/currentDispatcher";

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
const { currentDispatcher } = internals;

interface Hook {
    memoizedState: any;
    updateQueue: unknown;
    next: Hook | null;
}

export function renderWithHooks(wip: FiberNode) {
    currentlyRenderingFiber = wip;
    wip.memoizedState = null;

    const current = wip.alternate;

    if (current == null) {
        // mount阶段
        currentDispatcher.current = HookDispatcherOnMount;
    } else {
        // update阶段
    }
    const Component = wip.type;
    const props = wip.pendingProps;
    const children = Component(props);

    currentlyRenderingFiber = null;
    return children;
}


const HookDispatcherOnMount: Dispatcher = {
    useState: mountState
}

function dispatchSetState<State>(fiber: FiberNode | null, updateQueue: UpdateQueue<State>, action: Action<State>) {
    const update = createUpdate(action);
    enqueueUpdate(updateQueue, update);
    scheduleUpdateOnFiber(fiber!);
}

function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
    const hook = mountWorkInProgressHook();
    let memoizedState;
    if (initialState instanceof Function) {
        memoizedState = initialState();
    } else {
        memoizedState = initialState;
    }

    const queue = createUpdateQueue<State>() as UpdateQueue<any>;
    hook.updateQueue = queue;
    hook.memoizedState = memoizedState;

    const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);

    return [memoizedState, dispatch];
}


function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
        memoizedState: null,
        updateQueue: null,
        next: null
    }

    if (workInProgressHook === null) {
        if (currentlyRenderingFiber === null) {
            throw new Error('请在函数组件内调用hook')
        } else {
            workInProgressHook = hook;
            currentlyRenderingFiber.memoizedState = workInProgressHook;

        }
    } else {
        // mount时后续的hook
        workInProgressHook.next = hook
        workInProgressHook = hook;
    }

    return workInProgressHook;
}