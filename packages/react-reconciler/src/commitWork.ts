import { Container, appendChildToContainer, commitUpdate, removeChild } from "hostConfig";
import { FiberNode } from "./fiber";
import { ChildDeletion, MutationMask, NoFlags, Placement, Update } from "./fiberFlag";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";


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

    if ((flags & Update) != NoFlags) {
        commitUpdate(finshedWork);
        finshedWork.flags &= ~Update;
    }

    if ((flags & ChildDeletion) != NoFlags) {
        const deletions = finshedWork.deletions;
        if (deletions != null) {
            deletions.forEach(childToDelete => {
                commitDeletion(childToDelete);
            })
        }

        finshedWork.flags &= ~ChildDeletion;

    }
}
function commitDeletion(childToDelete: FiberNode) {
    let rootHostNode: FiberNode | null = null;
    commitNestedComponent(childToDelete, unmountFiber => {
        switch (unmountFiber.tag) {
            case HostComponent:
                // 解绑ref

                if (rootHostNode === null) {
                    rootHostNode = unmountFiber;
                }
                break;
            case HostText:
                if (rootHostNode === null) {
                    rootHostNode = unmountFiber;
                }
                break;
            case FunctionComponent:
                // TODO useEffect unmount流程的处理
                return;
            default:
                if (__DEV__) {
                    console.warn('未处理的unmount类型');
                }
                break;
        }
    })
    // 递归子树

    if (rootHostNode != null) {
        const hostParent = getHostParent(childToDelete);
        if (hostParent != null) {
            console.log('rootHostNode', rootHostNode, hostParent)
            removeChild((rootHostNode as FiberNode).stateNode as any, hostParent);
        }
    }

    childToDelete.return = null;
    childToDelete.child = null;

}

function commitNestedComponent(root: FiberNode, onCommitUnmount: (fiber: FiberNode) => void) {
    let node = root;
    while (true) {
        onCommitUnmount(node);
        if (node.child != null) {
            node.child.return = node;
            node = node.child;
            continue;
        }

        if (node === root) {
            return;
        }

        while (node.sibling === null) {
            if (node.return === null || node.return === root) {
                return;
            }

            node = node.return;
        }

        node.sibling.return = node.return;
        node = node.sibling;
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