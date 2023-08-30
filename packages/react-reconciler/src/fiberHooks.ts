import internals from "shared/internals";
import { FiberNode } from "./fiber";
import { Dispatcher, Reducer, Dispatch } from "react/src/currentDispatcher";
import { Update, UpdateQueue, createUpdate, createUpdateQueue, enqueueUpdate, processUpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";
import { Lane, NoLane, requestUpdateLane } from "./fiberLanes";
import { Flags, PassiveEffect, Ref } from "./fiberFlag";
import { HookHasEffect, Passive } from "./hookEffectTags";
import currentBatchConfig from "react/src/currentBatchConfig";

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
const { currentDispatcher } = internals;
let renderLane: Lane = NoLane;
interface Hook {
    memoizedState: any;
    updateQueue: UpdateQueue<any> | null;
    baseState: any;
    baseQueue: Update<any> | null,
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
    useRef: mountRef,
    useReducer: mountReducer,
    useTransition: mountTransition
}

function startTransition<state>(setPending: Dispatch<any>, callback: () => void) {
    setPending(true);
    const preTransition = currentBatchConfig.transition;
    currentBatchConfig.transition = 1;
    callback();
    setPending(false);
    currentBatchConfig.transition = preTransition;
}

function mountTransition(): [boolean, (callback: () => void) => void] {
    const [isPending, setPending] = mountState(false);
    const hook = mountWorkInProgressHook();
    const start = startTransition.bind(null, setPending);
    hook.memoizedState = start;
    return [isPending, start];
}


function updateTransition(): [boolean, (callback: () => void) => void] {
    const [isPending] = updateReducer();
    const hook = updateWorkInProgressHook();
    const start = hook.memoizedState;
    return [isPending as boolean, start];
}



function mountReducer<State>(reducer: Reducer, initialArg: State, init: (...args: any) => void): [State, Dispatch<State>] {
    const hook = mountWorkInProgressHook();
    let initialState;
    if (init != undefined) {
        initialState = init(initialArg);
    } else {
        initialState = initialArg;
    }

    hook.memoizedState = hook.baseState = initialState;
    const queue = createUpdateQueue<State>() as UpdateQueue<any>;
    queue.reducer = reducer;
    hook.updateQueue = queue;

    const dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
    return [hook.memoizedState, dispatch];
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

function updateReducer<State>(): [State, Dispatch<State>] {
    const hook = updateWorkInProgressHook();
    const queue = hook.updateQueue as UpdateQueue<State>;
    const baseState = hook?.baseState;

    const pending = queue.shared.pending;
    const current = currentHook;
    let baseQueue = current?.baseQueue;

    // update保存在current中, 包含pending和baseQueue

    if (pending !== null) {
        if (baseQueue != null) {
            const baseFirst = baseQueue.next;
            const pendingFirst = pending.next;
            baseQueue.next = pendingFirst;
            pending.next = baseFirst;

        }
        baseQueue = pending;
        current!.baseQueue = pending;
        queue.shared.pending = null;
    }

    if (baseQueue != null) {
        const { memoizedState, baseState: newBaseState, baseQueue: newBaseQueue } = processUpdateQueue(baseState, baseQueue, renderLane, queue.reducer);
        hook.memoizedState = memoizedState;
        hook.baseState = newBaseState;
        hook.baseQueue = newBaseQueue;
    }
    return [hook.memoizedState, queue.dispatch as Dispatch<State>];

}
const HookDispatcherOnUpdate: Dispatcher = {
    useState: updateReducer,
    useEffect: updateEffect,
    useRef: updateRef,
    useReducer: updateReducer,
    useTransition: updateTransition
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
    hook.memoizedState = hook.baseState = memoizedState;
    dispatch = queue.dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);


    return [memoizedState, dispatch];
}

function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
        memoizedState: null,
        updateQueue: null,
        next: null,
        baseQueue: null,
        baseState: null
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
        baseQueue: currentHook!.baseQueue,
        baseState: currentHook!.baseState,
    }

    if (workInProgressHook === null) {
        if (currentlyRenderingFiber === null) {
            throw new Error('请在函数组件内调用hook')
        } else {
            workInProgressHook = newHook;
            currentlyRenderingFiber.memoizedState = workInProgressHook;

        }
    } else {
        // mount时后续的hook
        workInProgressHook.next = newHook
        workInProgressHook = newHook;
    }

    return workInProgressHook;



}   