import { Instance, appendInitialChild, createInstance, createTextInstance } from "hostConfig";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { FiberNode } from "./fiber";
import { NoFlags, Update } from "./fiberFlag";
import { updateFiberProps } from "react-dom/src/SyntheticEvent";


function markUpdate(fiber: FiberNode) {
    fiber.flags |= Update;
}

export const completeWork = (wip: FiberNode) => {
    const newProps = wip.pendingProps;
    const current = wip.alternate;
    switch (wip.tag) {
        case HostComponent:
            if (current != null && wip.stateNode) {
                // var oldProps = current.pendingProps;
                updateFiberProps(wip.stateNode, newProps);
                // update阶段
            } else {
                // 构建DOM
                const instance = createInstance(wip.type, newProps);
                // 将DOM插入DOM树中
                appendAllChildren(instance, wip);
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            break;
        case HostText:
            if (current != null && wip.stateNode) {
                // update阶段
                const oldText = current.memoizedProps.content;
                const newText = newProps.content;

                if (oldText != newText) {
                    markUpdate(wip);
                }

            } else {
                // 构建DOM
                const instance = createTextInstance(newProps.content);
                // 将DOM插入DOM树中
                wip.stateNode = instance;
            }
            bubbleProperties(wip);
            break;
        case FunctionComponent:
        case HostRoot:
            bubbleProperties(wip);
            break;
        default:
            if (__DEV__) {
                console.warn('未处理的complateWork');
            }
            break;
    }
}

function appendAllChildren(parent: Instance, wip: FiberNode) {
    let node = wip.child;

    while (node != null) {
        if (node.tag === HostComponent || node.tag === HostText) {
            appendInitialChild(parent, node?.stateNode);
        } else if (node.child !== null) {
            node.child.return = node;
            node = node.child;
            continue;
        }

        if (node === wip) {
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === wip) {
                return;
            }
            node = node?.return;
        }

        node.sibling.return = node.return;
        node = node.sibling;
    }

}

function bubbleProperties(wip: FiberNode) {
    let subtreeFlags = NoFlags;
    let child = wip.child;

    while (child != null) {
        subtreeFlags |= child.subtreeFlags;
        subtreeFlags |= child.flags;

        child.return = wip;
        child = child.sibling;
    }

    wip.subtreeFlags |= subtreeFlags;
}