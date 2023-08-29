import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatcher } from "react/src/currentDispatcher";
import { UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Dispatch } from "react/src/currentDispatcher";
import { Lane, NoLane, requestUpdateLane } from "./fiberLanes";
import { Flags, PassiveEffect, Ref } from "./fiberFlag";
import { HookHasEffect, Passive } from "./hookEffectTags";

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

export interface Effect {
    tag: Flags,
    create: EffectCallback | void;
    destory: EffectCallback | void;
    deps: EffectDeps;
    next: any;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
    lastEffect: Effect | null;
}
type EffectCallback = () => void;

type EffectDeps = any[] | null;

export function renderWithHooks(wip: FiberNode, lane: Lane) {
    currentlyRenderingFiber = wip;
    wip.memoizedState = null;
    wip.updateQueue = null;
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
    useState: mountState,
    useEffect: mountEffect,
    useRef: mountRef
}
function mountRef<T>(initialValue: T): { current: T } {
    const hook = mountWorkInProgressHook();
    const ref = { current: initialValue }
    hook.memoizedState = ref;

    return ref;

}

function updateRef<T>(initialValue: T): { current: T } {
    const hook = updateWorkInProgressHook();
    return hook.memoizedState;

}
const HookDispatcherOnUpdate: Dispatcher = {
    useState: updateState,
    useEffect: updateEffect,
    useRef: updateRef
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    let destory: EffectCallback | void = () => { };

    if (currentHook != null) {
        const prevEffect = currentHook.memoizedState as Effect;
        destory = prevEffect.destory;

        if (nextDeps != null) {
            // 浅比较依赖
            const prevDeps = prevEffect.deps;
            if (areHookInputEqual(prevDeps, nextDeps)) {
                hook.memoizedState = pushEffect(Passive, create, destory, nextDeps);
                return;
            }
        }
    }
    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    hook.memoizedState = pushEffect(Passive | HookHasEffect, create, destory, nextDeps);
}

function mountEffect(create: EffectCallback | void, deps: EffectDeps) {
    const hook = mountWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    (currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
    hook.memoizedState = pushEffect(Passive | HookHasEffect, create, undefined, nextDeps);
}

function areHookInputEqual(nextDeps: EffectDeps, prevDeps: EffectDeps) {
    if (prevDeps == null || nextDeps == null) {
        return false;
    }

    for (let i = 0; i < prevDeps.length && nextDeps.length; i++) {
        if (Object.is(prevDeps[i], nextDeps[i])) {
            continue;
        }

        return false;

    }

    return true;
}

function pushEffect(hookFlags: Flags, create: EffectCallback | void, destory: EffectCallback | void, deps: EffectDeps): Effect {
    const effect: Effect = {
        tag: hookFlags,
        create,
        destory,
        deps,
        next: null
    }

    const fiber = currentlyRenderingFiber as FiberNode;
    let updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
    if (updateQueue === null) {
        updateQueue = createFCUpdateQueue();
        fiber.updateQueue = updateQueue;
        effect.next = effect;
        updateQueue.lastEffect = effect;
    } else {
        // 插入effect;
        const lastEffect = updateQueue.lastEffect;
        if (lastEffect == null) {
            effect.next = effect;
            updateQueue.lastEffect = effect;
        } else {
            const firstEffect = lastEffect.next;
            lastEffect.next = effect;
            effect.next = firstEffect;
            updateQueue.lastEffect = effect;
        }
    }

    return effect;
}


function createFCUpdateQueue<State>(): FCUpdateQueue<State> {
    const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
    updateQueue.lastEffect = null;
    return updateQueue;
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