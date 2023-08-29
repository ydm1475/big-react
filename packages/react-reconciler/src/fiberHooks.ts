import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatcher } from "react/src/currentDispatcher";
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Dispatch } from "react/src/currentDispatcher";
import { Lane, NoLane, requestUpdateLane } from "./fiberLanes";

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
const { currentDispatcher } = internals;
let renderLane: Lane = NoLane;
interface Hook {
    memoizedState: any;
    updateQueue: UpdateQueue<any> | null;
    next: Hook | null;
}

export function renderWithHooks(wip: FiberNode, lane: Lane) {
    currentlyRenderingFiber = wip;
    wip.memoizedState = null;
    renderLane = lane;
    const current = wip.alternate;
    if (current == null) {
        // mount阶段
        currentDispatcher.current = HookDispatcherOnMount;
    } else {
        // update阶段
        currentDispatcher.current = HookDispatcherOnUpdate;
    }
    const Component = wip.type;
    const props = wip.pendingProps;
    const children = Component(props);
    currentlyRenderingFiber = null;

    workInProgressHook = null;
    currentHook = null;
    renderLane = NoLane;
    return children;
}


const HookDispatcherOnMount: Dispatcher = {
    useState: mountState
}

const HookDispatcherOnUpdate: Dispatcher = {
    useState: updateState
}

function dispatchSetState<State>(fiber: FiberNode | null, updateQueue: UpdateQueue<State>, action: Action<State>) {

    const lane = requestUpdateLane();
    const update = createUpdate(action, lane);
    enqueueUpdate(updateQueue, update);

    scheduleUpdateOnFiber(fiber!, lane);
}

function mountState<State>(initialState: (() => State) | State): [State, Dispatch<State>] {
    const hook = mountWorkInProgressHook();
    let memoizedState;
    if (initialState instanceof Function) {
        memoizedState = initialState();
    } else {
        memoizedState = initialState;
    }
    let dispatch = null;
    const queue = createUpdateQueue<State>() as UpdateQueue<any>;
    hook.updateQueue = queue;
    hook.memoizedState = memoizedState;

    dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);


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
            currentlyRenderingFiber.hook = workInProgressHook;

        }
    } else {
        // mount时后续的hook
        workInProgressHook.next = hook
        workInProgressHook = hook;
    }

    return workInProgressHook;
}


function updateState<State>(): [State, Dispatch<State>] {

    const hook = updateWorkInProgressHook();
    const queue = hook.updateQueue as UpdateQueue<State>;
    const pending = queue.shared.pending;
    queue.shared.pending = null;

    if (pending !== null) {
        const { memoizedState } = processUpdateQueue(hook.memoizedState, pending, renderLane);
        hook.memoizedState = memoizedState;
    }


    return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function updateWorkInProgressHook(): Hook {
    let nextCurrentHook: Hook | null;
    if (currentHook === null) {
        // FC update时的第一个hook
        const current = currentlyRenderingFiber?.alternate;
        if (current != null) {
            nextCurrentHook = current.memoizedState;

        } else {
            nextCurrentHook = null;
        }
    } else {
        // FC update时后续的hook
        nextCurrentHook = currentHook.next;
    }

    if (nextCurrentHook === null) {
        throw new Error(`组件${currentlyRenderingFiber?.type}hook使用有误`)
    }

    currentHook = nextCurrentHook;
    const newHook: Hook = {
        memoizedState: currentHook?.memoizedState,
        updateQueue: currentHook!.updateQueue,
        next: null,
    }

    if (workInProgressHook === null) {
        if (currentlyRenderingFiber === null) {
            throw new Error('请在函数组件内调用hook')
        } else {
            workInProgressHook = newHook;
            currentlyRenderingFiber.memoizedState = workInProgressHook;
            currentlyRenderingFiber.hook = workInProgressHook;

        }
    } else {
        // mount时后续的hook
        workInProgressHook.next = newHook
        workInProgressHook = newHook;
    }

    return workInProgressHook;



}   