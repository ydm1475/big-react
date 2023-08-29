import { scheduleMicroTask } from "hostConfig";
import { beginWork } from "./beginWork";
import { commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { FiberNode, FiberRootNode, createWorkInProgress } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlag";
import { Lane, NoLane, SyncLane, getHighesPriorityLane, markRootFinshed, mergeLanes } from "./fiberLanes";
import { flushSyncCallbacks, scheduleSyncCallback } from "./syncTaskQueue";
import { HostRoot } from "./workTags";

let workInProgress: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
function prepareFreshStack(root: FiberRootNode, lane: Lane) {
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
    const updateLane = getHighesPriorityLane(root.pendingLanes);
    // 没有更新
    if (updateLane == NoLane) {
        return;
    }

    if (updateLane === SyncLane) {
        // 同步更新，用微任务调度
        if (__DEV__) {
            console.log('在微任务中调度优先级', updateLane);
        }
        scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root, updateLane));
        scheduleMicroTask(flushSyncCallbacks);
    } else {
        // 其他优先级，会用宏任务调度。重运行时

    }
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
    const nextLane = getHighesPriorityLane(root.pendingLanes);
    if (nextLane != SyncLane) {
        ensureRootIsScheduled(root);
        return;
    }
    console.log('root', root);
    prepareFreshStack(root, lane);
    do {
        try {
            workLoop();
            break;
        } catch (e) {
            if (__DEV__) {
                console.warn('发生错误');

            }
            workInProgress = null;
        }
    } while (true)

    // 生成的整个fiberNode
    const finshedWork = root.current.alternate;
    root.finshedWork = finshedWork;
    root.finishedLane = lane;
    wipRootRenderLane = NoLane;
    // wip fiberNode书中的flags
    commitRoot(root);
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

    markRootFinshed(root, lane);
    // root flags root subtreeFlags
    const subtreeHasEffect = (finshedWork.subtreeFlags & MutationMask) != NoFlags;
    const rootHasEffect = (finshedWork.flags & MutationMask) != NoFlags;
    if (subtreeHasEffect || rootHasEffect) {
        // beforeMutation

        // mutation Placement
        commitMutationEffects(finshedWork);
        root.current = finshedWork;

        // layout
    } else {
        root.current = finshedWork;
    }

}
function workLoop() {
    while (workInProgress != null) {
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