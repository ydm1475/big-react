import { Container, appendChildToContainer } from "hostConfig";
import { FiberNode } from "./fiber";
import { MutationMask, NoFlags, Placement } from "./fiberFlag";
import { HostComponent, HostRoot, HostText } from "./workTags";


let nextEffect: FiberNode | null = null;

export function commitMutationEffects(finshedWork: FiberNode) {
    nextEffect = finshedWork;

    while (nextEffect != null) {
        const child: FiberNode | null = nextEffect.child;

        if ((nextEffect.subtreeFlags & MutationMask) !== NoFlags && child != null) {
            nextEffect = child;
        } else {
            // 向上遍历
            up: while (nextEffect != null) {
                commitMutationEffectsOnFiber(nextEffect);
                const sibling: FiberNode | null = nextEffect.sibling;
                if (sibling != null) {
                    nextEffect = sibling;
                    break up;
                }

                nextEffect = nextEffect.return;
            }
        }
    }

}


const commitMutationEffectsOnFiber = (finshedWork: FiberNode) => {
    const flags = finshedWork.flags;
    if ((flags & Placement) != NoFlags) {
        commitPlacement(finshedWork);
        finshedWork.flags &= ~Placement;
    }
}


function commitPlacement(finshedWork: FiberNode) {
    if (__DEV__) {
        console.warn('执行Placement操作', finshedWork);
    }
    const hostParent = getHostParent(finshedWork);
    appendPlacementNodeIntoContainer(finshedWork, hostParent);

}

function getHostParent(fiber: FiberNode) {
    let parent = fiber.return;
    while (parent) {
        const parentTag = parent.tag;
        if (parentTag === HostComponent) {
            return parent.stateNode;
        }

        if (parentTag === HostRoot) {
            return parent.stateNode.container;
        }

        parent = parent.return;

    }
    if (__DEV__) {
        console.warn('未找到对应host');
    }

}

function appendPlacementNodeIntoContainer(finshedWork: FiberNode, hostParent: Container) {
    if (finshedWork.tag === HostComponent || finshedWork.tag === HostText) {
        appendChildToContainer(hostParent, finshedWork.stateNode);
        return;
    }

    const child = finshedWork.child;
    if (child != null) {
        appendPlacementNodeIntoContainer(child, hostParent);
        let sibling = child.sibling;

        while (sibling != null) {
            appendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}