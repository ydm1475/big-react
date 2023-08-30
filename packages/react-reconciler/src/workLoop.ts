import { scheduleMicroTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitHookEffectListCreate, commitHookEffectListDestory, commitHookEffectListUnmount, commitLayoutEffects, commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { FiberNode, FiberRootNode, PendingPassiveEffects, createWorkInProgress } from "./fiber";
import { MutationMask, NoFlags, PassiveMask } from "./fiberFlag";
import { Lane, NoLane, SyncLane, getHighestPriorityLane, lanesToSchedulerPriority, markRootFinshed, mergeLanes } from "./fiberLanes";
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue";
import { HostRoot } from "./workTags";
import {
    unstable_scheduleCallback as scheduleCallback,
    unstable_NormalPriority as NormalPriority,
    unstable_shouldYield as shouldYield,
    unstable_cancelCallback,
} from 'scheduler';
import { HookHasEffect, Passive } from "./hookEffectTags";

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoesHasPassiveEffects: boolean = false;
type RootExitStatus = number;
const RootInComplete = 1;
const RootCompleted = 2;

function prepareFreshStack(root: FiberRootNode, lane: Lane) {
    root.finishedLane = NoLane;
    root.finshedWork = null;
    workInProgress = createWorkInProgress(root.current, {});
    wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
    // 调度功能,参数中的fiber指的是发生Update的fiber节点，要向上遍历到根节点
    const root = markUpdateFromFiberToRoot(fiber);
    markRootUpdated(root!, lane);
    ensureRootIsScheduled(root!);
}

function ensureRootIsScheduled(root: FiberRootNode,) {
    const updateLane = getHighestPriorityLane(root.pendingLanes);
    const existCallBack = root.callbackNode;
    // 没有更新
    if (updateLane === NoLane) {
        if (existCallBack != null) {
            unstable_cancelCallback(existCallBack);
        }
        root.callbackNode = null;
        root.callbackPriority = NoLane;
        return;
    }

    const curPriority = updateLane;
    const prevPriority = root.callbackPriority;

    if (curPriority === prevPriority) {
        return;
    }

    if (existCallBack != null) {
        unstable_cancelCallback(existCallBack);
    }

    let newCallbackNode = null;

    if (updateLane === SyncLane) {
        // 同步更新，用微任务调度
        if (__DEV__) {
            console.warn('在微任务中调度优先级', updateLane);
        }
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
        scheduleMicroTask(flushSyncCallbacks);
    } else {
        // 其他优先级，会用宏任务调度。重运行时
        const schedulerPriority = lanesToSchedulerPriority(updateLane);
        newCallbackNode = scheduleCallback(schedulerPriority, performConcurrentWorkOnRoot.bind(null, root));
    }

    root.callbackNode = newCallbackNode;
    root.callbackPriority = curPriority;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
    root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

function markUpdateFromFiberToRoot(fiber: FiberNode): FiberRootNode | null {
    let node = fiber;
    let parent = node.return;
    while (parent != null) {
        node = parent!;
        parent = node.return;
    }

    if (node.tag === HostRoot) {
        // node.stateNode代表的是FiberRoot
        return node.stateNode;
    }

    return null;

}

function performConcurrentWorkOnRoot(root: FiberRootNode, didTimeout: boolean): any {
    // 保证useEffect回调执行
    const curCallback = root.callbackNode;
    const dipFlushPassiveEffect = flushPassiveEffects(root.pendingPassiveEffects);
    if (dipFlushPassiveEffect) {
        if (root.callbackNode != curCallback) {
            return null;
        }
    }

    const lane = getHighestPriorityLane(root.pendingLanes);
    const callbackRootNode = root.callbackNode;
    if (lane === NoLane) {
        return;
    }

    const neesSync = lane === SyncLane || didTimeout;
    const exitStatus = renderRoot(root, lane, !neesSync);
    ensureRootIsScheduled(root);
    if (exitStatus === RootInComplete) {
        // 中断 
        if (root.callbackNode != callbackRootNode) {
            return null;
        }

        return performConcurrentWorkOnRoot.bind(null, root);

    }

    console.log('root', root);

    if (exitStatus === RootCompleted) {
        // 生成的整个fiberNode
        const finshedWork = root.current.alternate;
        root.finshedWork = finshedWork;
        root.finishedLane = lane;
        wipRootRenderLane = NoLane;
        // wip fiberNode书中的flags
        commitRoot(root);
    } else {
        console.log('还未实现sync结束阶段')
    }

}

function performSyncWorkOnRoot(root: FiberRootNode) {
    const nextLane = getHighestPriorityLane(root.pendingLanes);
    if (nextLane != SyncLane) {
        ensureRootIsScheduled(root);
        return;
    }
    const exitStatus = renderRoot(root, nextLane, false);
    if (exitStatus === RootCompleted) {
        // 生成的整个fiberNode
        const finshedWork = root.current.alternate;
        root.finshedWork = finshedWork;
        root.finishedLane = nextLane;
        wipRootRenderLane = NoLane;
        // wip fiberNode书中的flags
        commitRoot(root);
    } else {
        console.log('还未实现sync结束阶段')
    }


}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
    if (__DEV__) {
        console.log(`开始${shouldTimeSlice ? '并发' : '同步'}`)
    }

    if (wipRootRenderLane != lane) {
        prepareFreshStack(root, lane);
    }

    do {
        try {
            shouldTimeSlice ? workLoopConcurrent() : workLoopSync()
            break;
        } catch (e) {
            if (__DEV__) {
                console.warn('发生错误', e);

            }
            workInProgress = null;
        }
    } while (true)

    // 中断执行或者render阶段执行完毕
    if (shouldTimeSlice && workInProgress != null) {
        return RootInComplete;
    }

    if (!shouldTimeSlice && workInProgress !== null && __DEV__) {
        console.error('render阶段结束时wip不为null');
    }

    return RootCompleted;

}



function commitRoot(root: FiberRootNode) {
    const finshedWork = root.finshedWork;

    if (finshedWork === null) {
        return;
    }

    if (__DEV__) {
        console.warn('commit开始', finshedWork);
    }

    const lane = root.finishedLane;

    if (lane === NoLane && __DEV__) {
        console.warn('commit阶段finishedLane不应该为NoLane')
    }

    // 重置
    root.finshedWork = null;
    root.finishedLane = NoLane;

    if ((finshedWork.flags & PassiveMask) !== NoFlags || (finshedWork.subtreeFlags & PassiveMask) !== NoFlags) {
        rootDoesHasPassiveEffects = true;
        scheduleCallback(NormalPriority, () => {
            // 执行副作用
            flushPassiveEffects(root.pendingPassiveEffects);
            return;
        });
    }

    markRootFinshed(root, lane);
    // root flags root subtreeFlags
    const subtreeHasEffect = (finshedWork.subtreeFlags & MutationMask) != NoFlags;
    const rootHasEffect = (finshedWork.flags & MutationMask) != NoFlags;
    if (subtreeHasEffect || rootHasEffect) {
        // beforeMutation

        // mutation Placement
        commitMutationEffects(finshedWork, root);
        root.current = finshedWork;
        commitLayoutEffects(finshedWork, root)


        // layout
    } else {
        root.current = finshedWork;
    }

    rootDoesHasPassiveEffects = false;
    ensureRootIsScheduled(root);

}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
    let dipFlushPassiveEffect = false;
    pendingPassiveEffects.unmount.forEach(effect => {
        dipFlushPassiveEffect = true;
        commitHookEffectListDestory(Passive, effect);
    });
    pendingPassiveEffects.unmount = [];
    pendingPassiveEffects.update.forEach(effect => {
        dipFlushPassiveEffect = true;
        commitHookEffectListUnmount(Passive | HookHasEffect, effect);
    });

    pendingPassiveEffects.update.forEach(effect => {
        dipFlushPassiveEffect = true;
        commitHookEffectListCreate(Passive | HookHasEffect, effect);
    });
    pendingPassiveEffects.update = [];
    flushSyncCallbacks();

    return dipFlushPassiveEffect;
}

function workLoopSync() {
    while (workInProgress != null) {
        performUnitOfWork(workInProgress);
    }
}

function workLoopConcurrent() {
    while (workInProgress != null && !shouldYield()) {
        performUnitOfWork(workInProgress);
    }
}

function performUnitOfWork(fiber: FiberNode) {
    // 这里的next指的是fiber的child
    const next = beginWork(fiber, wipRootRenderLane);
    fiber.memoizedProps = fiber.pendingProps;
    if (next === null) {
        completeUnitOfWork(fiber);
    } else {
        workInProgress = next;
    }

}

function completeUnitOfWork(fiber: FiberNode) {
    let node: FiberNode | null = fiber;

    do {
        completeWork(node);
        const sibling = node.sibling;
        if (sibling != null) {
            workInProgress = sibling;
            return;
        }
        node = node.return;
        workInProgress = node;
    } while (node != null)
}