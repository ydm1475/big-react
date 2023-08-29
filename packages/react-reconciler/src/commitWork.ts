import { Container, Instance, appendChildToContainer, commitUpdate, insertChildToContainer, removeChild } from "hostConfig";
import { FiberNode, FiberRootNode, PendingPassiveEffects } from "./fiber";
import { ChildDeletion, Flags, LayoutMask, MutationMask, NoFlags, PassiveEffect, PassiveMask, Placement, Ref, Update } from "./fiberFlag";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import { Effect, FCUpdateQueue } from "./fiberHooks";
import { HookHasEffect } from "./hookEffectTags";


let nextEffect: FiberNode | null = null;


export function commitEffects(phrase: 'mutation' | 'layout', mask: Flags, callback: (fiber: FiberNode, root: FiberRootNode) => void) {

    return (finshedWork: FiberNode, root: FiberRootNode) => {
        nextEffect = finshedWork;
        while (nextEffect != null) {
            const child: FiberNode | null = nextEffect.child;

            if ((nextEffect.subtreeFlags & mask) !== NoFlags && child != null) {
                nextEffect = child;
            } else {
                // 向上遍历
                up: while (nextEffect != null) {
                    callback(nextEffect, root);
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
}
function safelyDetachRef(current: FiberNode) {
    const ref = current.ref;
    if (ref != null) {
        if (typeof ref === 'function') {
            ref(null)
        } else {
            ref.current = null;
        }
    }
}

const commitMutationEffectsOnFiber = (finshedWork: FiberNode, root: FiberRootNode) => {
    const { flags, tag } = finshedWork;

    if ((flags & Ref) != NoFlags && tag === HostComponent) {
        // 绑定新的ref
        safelyDetachRef(finshedWork);
    }
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
                commitDeletion(childToDelete, root);
            })
        }

        finshedWork.flags &= ~ChildDeletion;

    }

    if ((flags & PassiveEffect) != NoFlags) {
        // 收集回调
        commitPassiveEffect(finshedWork, root, 'update');
        finshedWork.flags &= ~PassiveEffect;

    }
}

function safelyAttachRef(fiber: FiberNode) {
    const ref = fiber.ref;
    if (ref != null) {
        const instance = fiber.stateNode;
        if (typeof ref == 'function') {
            ref(instance);
        } else {
            ref.current = instance;
        }
    }
}

function commiLayoutEffectsOnFiber(finshedWork: FiberNode, root: FiberRootNode) {
    const { flags, tag } = finshedWork;
    if ((flags & Ref) != NoFlags && tag === HostComponent) {
        // 绑定新的ref
        safelyAttachRef(finshedWork);
        finshedWork.flags &= ~Ref;
    }

}


export const commitMutationEffects = commitEffects('mutation', (MutationMask | PassiveMask), commitMutationEffectsOnFiber);
export const commitLayoutEffects = commitEffects('layout', LayoutMask, commiLayoutEffectsOnFiber);

function commitPassiveEffect(fiber: FiberNode, root: FiberRootNode, type: keyof PendingPassiveEffects) {
    // update unmount
    if (fiber.tag != FunctionComponent || (type === "update" && (fiber.flags & PassiveEffect) === NoFlags)) {
        return;
    }

    const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;
    if (updateQueue != null) {
        if (updateQueue.lastEffect === null && __DEV__) {
            console.warn('当FC存在PassiveEffect flag时不应该不存在effect');
            return;
        }

        root.pendingPassiveEffects[type].push(updateQueue.lastEffect as Effect);
    }

}
function commitHookEffectList(flags: Flags, lastEffect: Effect, callback: (effect: Effect) => void) {
    let effect = lastEffect.next;
    do {
        if ((effect.tag & flags) === flags) {
            callback(effect);
        }
        effect = effect.next;
    } while (effect != lastEffect.next)
}

export function commitHookEffectListDestory(flags: Flags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, effect => {
        const destory = effect.destory;
        if (typeof destory === "function") {
            destory();
        }
        effect.tag &= ~HookHasEffect;
    })

}

export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, effect => {
        const destory = effect.destory;

        if (typeof destory === "function") {
            destory();
        }
    })
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
    commitHookEffectList(flags, lastEffect, effect => {
        const create = effect.create;
        if (typeof create === "function") {
            effect.destory = create();
        }
    })
}

function recordHostChildrenToDelete(childrenToDelete: FiberNode[], unmountFiber: FiberNode) {
    // 1、找到第一个root host节点
    // 2、每找到一个，判断下这个节点是不是1找到的那个兄弟节点
    const lastOne = childrenToDelete[childrenToDelete.length - 1];
    if (!lastOne) {
        childrenToDelete.push(unmountFiber);
    } else {
        let node = lastOne.sibling;
        while (node != null) {
            if (unmountFiber === node) {
                childrenToDelete.push(unmountFiber);
            }
            node = node.sibling;
        }
    }
}
function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
    const rooChildrenToDelete: FiberNode[] = [];
    commitNestedComponent(childToDelete, unmountFiber => {
        switch (unmountFiber.tag) {
            case HostComponent:
                // 解绑ref
                safelyDetachRef(unmountFiber);
                recordHostChildrenToDelete(rooChildrenToDelete, unmountFiber);
                break;
            case HostText:
                recordHostChildrenToDelete(rooChildrenToDelete, unmountFiber);
                break;
            case FunctionComponent:
                commitPassiveEffect(unmountFiber, root, 'unmount');
                return;
            default:
                if (__DEV__) {
                    console.warn('未处理的unmount类型');
                }
                break;
        }
    })
    // 递归子树
    if (rooChildrenToDelete.length != 0) {
        const hostParent = getHostParent(childToDelete);
        rooChildrenToDelete.forEach(node => {
            removeChild(node.stateNode, hostParent);
        })
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
    const sibling = getHostSibling(finshedWork);

    insertOrAppendPlacementNodeIntoContainer(finshedWork, hostParent, sibling);
}


function getHostSibling(fiber: FiberNode) {
    let node: FiberNode = fiber;
    findSibling: while (true) {
        while (node.sibling === null) {
            const parent = node.return;
            if (parent === null || parent.tag === HostComponent || parent.tag === HostText) {
                return null;
            }
            node = parent;
        }
        node.sibling.return = node.return;
        node = node.sibling;

        while (node.tag != HostText && node.tag != HostComponent) {
            if ((node.flags & Placement) != NoFlags) {
                continue findSibling;
            }

            if (node.child == null) {
                continue findSibling;
            } else {
                node.child.return = node;
                node = node.child;
            }
        }

        if ((node.flags & Placement) === NoFlags) {
            return node.stateNode;
        }
    }
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

function insertOrAppendPlacementNodeIntoContainer(finshedWork: FiberNode, hostParent: Container, before?: Instance) {
    if (finshedWork.tag === HostComponent || finshedWork.tag === HostText) {
        if (before) {
            insertChildToContainer(finshedWork.stateNode, hostParent, before);
        } else {
            appendChildToContainer(hostParent, finshedWork.stateNode);

        }
        return;
    }

    const child = finshedWork.child;
    if (child != null) {
        insertOrAppendPlacementNodeIntoContainer(child, hostParent);
        let sibling = child.sibling;

        while (sibling != null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
            sibling = sibling.sibling;
        }
    }
}