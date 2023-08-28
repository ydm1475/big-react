import { beginWork } from "./beginWork";
import { commitMutationEffects } from "./commitWork";
import { completeWork } from "./completeWork";
import { FiberNode, FiberRootNode, createWorkInProgress } from "./fiber";
import { MutationMask, NoFlags } from "./fiberFlag";
import { HostRoot } from "./workTags";

let workInProgress: FiberNode | null = null;

function prepareFreshStack(root: FiberRootNode) {
    workInProgress = createWorkInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
    // 调度功能,参数中的fiber指的是发生Update的fiber节点，要向上遍历到根节点
    const root = markUpdateFromFiberToRoot(fiber);
    renderRoot(root!);
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

function renderRoot(root: FiberRootNode) {
    console.log('root1', root);

    prepareFreshStack(root);
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
    console.log('root', root);
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
    // 重置
    root.finshedWork = null;
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
    const next = beginWork(fiber);
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