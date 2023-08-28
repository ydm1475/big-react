import { ReactElement } from "shared/ReactTypes";
import { FiberNode } from "./fiber";
import { UpdateQueue, processUpdateQueue } from "./updateQueue";
import { Fragment, FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { mountChildReconciler, reconcileChildFibers } from "./childFibers";
import { renderWithHooks } from "./fiberHooks";

export const beginWork = (wip: FiberNode) => {
    switch (wip.tag) {
        case HostRoot:
            return updateHostRoot(wip);

        case HostComponent:
            return updateHostComponent(wip);
        case HostText:
            return null;
        case FunctionComponent:
            return updateFunctionComponent(wip);
        case Fragment:
            return updateFragment(wip);
        default:
            if (__DEV__) {
                console.warn('beginWork未定义的类型')
            }
            break;
    }
    return null;
}

function updateFragment(wip: FiberNode) {
    const nextChildren = wip.pendingProps;
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function updateHostRoot(wip: FiberNode) {
    const baseState = wip.memoizedState;
    const updateQueue = wip.updateQueue as UpdateQueue<Element>;
    const pending = updateQueue.shared.pending;
    updateQueue.shared.pending = null;
    const { memoizedState } = processUpdateQueue(baseState, pending);
    wip.memoizedState = memoizedState;

    const nextChildren = wip.memoizedState;
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function updateHostComponent(wip: FiberNode) {
    const nextProps = wip.pendingProps;
    const nextChildren = nextProps.children;
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function updateFunctionComponent(wip: FiberNode) {
    const nextChildren = renderWithHooks(wip);
    reconcileChildren(wip, nextChildren);
    return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElement) {
    const current = wip.alternate;
    if (current === null) {
        // mount流程
        wip.child = mountChildReconciler(wip, null, children);
    } else {
        // update流程
        wip.child = reconcileChildFibers(wip, current?.child, children);
    }


}