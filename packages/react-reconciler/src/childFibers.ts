import { Key, Props, ReactElement } from "shared/ReactTypes";
import { FiberNode, createFiberFromElement, createFiberFromFragment, createWorkInProgress } from "./fiber";
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from "shared/ReactSymbols";
import { Fragment, HostComponent, HostText } from "./workTags";
import { ChildDeletion, Placement, Update } from "./fiberFlag";

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackEffects: boolean) {

    function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
        if (!shouldTrackEffects) {
            return;
        }

        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        } else {
            deletions.push(childToDelete);
        }
    }

    function deleteRemainingChildren(returnFiber: FiberNode, currentFirstChild: FiberNode | null) {
        if (!shouldTrackEffects) {
            return;
        }

        let childToDelete = currentFirstChild;
        while (childToDelete != null) {

            deleteChild(returnFiber, childToDelete);
            childToDelete = childToDelete.sibling;
        }

    }
    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        // 根据reactElement创建一个filber并返回
        const key = element.key || null;
        work: while (currentFiber != null) {
            // 更新
            if (currentFiber.key === key) {
                // key相同
                if (element.$$typeof === REACT_ELEMENT_TYPE) {
                    if (currentFiber.type === element.type) {
                        let props = element.props;
                        if (element.type === REACT_FRAGMENT_TYPE) {
                            props = element.props.children;
                        }
                        // type 相同
                        const existing = useFiber(currentFiber, props);

                        existing.return = returnFiber;
                        deleteRemainingChildren(returnFiber, currentFiber.sibling);
                        return existing;
                    }
                    // key相同, type不同，删掉所有旧的
                    deleteChild(returnFiber, currentFiber);
                    break work;
                } else {
                    if (__DEV__) {
                        console.warn('还未实现的react类型', element);
                        break work;
                    }
                }
            } else {
                // key不同, 
                deleteChild(returnFiber, currentFiber);
                currentFiber = currentFiber.sibling;
            }
        }
        let fiber;
        if (element.type === REACT_FRAGMENT_TYPE) {
            fiber = createFiberFromFragment(element.props.children, key);
        } else {
            fiber = createFiberFromElement(element);
        }
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {

        while (currentFiber != null) {
            if (currentFiber.tag === HostText) {
                const existing = useFiber(currentFiber, { content });
                existing.return = returnFiber;
                deleteRemainingChildren(returnFiber, currentFiber.sibling);
                return existing;
            }

            deleteChild(returnFiber, currentFiber);
            currentFiber = currentFiber.sibling;
        }


        const fiber = new FiberNode(HostText, { content }, null);
        fiber.return = returnFiber;
        return fiber;
    }

    function placeSingleChild(fiber: FiberNode) {
        // 代表是首屏渲染流程
        if (shouldTrackEffects && fiber.alternate == null) {
            fiber.flags |= Placement;
        }

        return fiber;
    }

    function reconcileChildrenArray(returnFiber: FiberNode, currentFirstChild: FiberNode | null, newChild: any[]) {
        let lastPlacedIndex: number = 0;
        let lastNewFiber: FiberNode | null = null;
        let firstNewFiber: FiberNode | null = null;

        //  1、将current保存在map中
        const existingChildren: ExistingChildren = new Map();
        let current = currentFirstChild;

        while (current != null) {
            const keyToUse = current.key != null ? current.key : current.index;
            existingChildren.set(keyToUse, current);
            current = current.sibling;
        }

        // 2、遍历newChild，寻找是否可复用
        for (let i = 0; i < newChild.length; i++) {
            const after = newChild[i];

            const newFiber = updateFromMap(returnFiber, existingChildren, i, after);
            if (newFiber === null) {
                continue;
            }
            // 3、标记移动还是插入
            newFiber.index = i;
            newFiber.return = returnFiber;
            if (lastNewFiber === null) {
                lastNewFiber = newFiber;
                firstNewFiber = newFiber;
            } else {
                lastNewFiber.sibling = newFiber;
                lastNewFiber = lastNewFiber.sibling;
            }

            if (!shouldTrackEffects) {
                continue;
            }

            const current = newFiber.alternate;
            if (current != null) {
                const oldIndex = current.index;
                if (oldIndex < lastPlacedIndex) {
                    // 移动
                    newFiber.flags |= Placement;
                    continue
                } else {
                    lastPlacedIndex = oldIndex;
                }
            } else {
                // mount阶段
                newFiber.flags |= Placement;
            }

        }
        // 4、将map剩余的标记为删除
        existingChildren.forEach(fiber => {
            deleteChild(returnFiber, fiber);
        })

        return firstNewFiber;
    }

    function updateFromMap(returnFiber: FiberNode, existingChildren: ExistingChildren, index: number, element: any): FiberNode | null {
        const keyToUse = element.key != null ? element.key : index;
        const before = existingChildren.get(keyToUse) as FiberNode | null;
        if (typeof element === 'string' || typeof element === 'number') {
            if (before) {
                if (before.tag === HostText) {
                    existingChildren.delete(keyToUse);
                    return useFiber(before, { content: element + '' })
                }
            }

            return new FiberNode(HostText, { content: element + '' }, null);
        }

        if (typeof element === 'object' && element != null) {
            switch (element.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    if (element.type === REACT_FRAGMENT_TYPE) {
                        return updateFragment(returnFiber, before, element, keyToUse, existingChildren);
                    }
                    if (before) {
                        if (before.type === element.type) {
                            existingChildren.delete(keyToUse);
                            return useFiber(before, element.props);
                        }
                    }
                    return createFiberFromElement(element);


                default:
                    break;
            }

            // TODO 数组类型
            if (Array.isArray(element)) {
                return updateFragment(returnFiber, before, element, keyToUse, existingChildren);
            }
        }

        return null;
    }



    return function reconcileChildFibers(returnFiber: FiberNode, currentFiber: FiberNode | null, newChild?: ReactElement) {

        const isUnkeyedTopLevelFragment =
            typeof newChild === 'object' &&
            newChild !== null &&
            newChild.type === REACT_FRAGMENT_TYPE &&
            newChild.key === null;

        if (isUnkeyedTopLevelFragment) {
            newChild = newChild?.props.children;
        }

        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));
                default:
                    break;
            }

            if (Array.isArray(newChild)) {
                return reconcileChildrenArray(returnFiber, currentFiber, newChild);
            }
        }


        // 多节点情况
        // 文本节点
        if (typeof newChild == "string" || typeof newChild == "number") {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild));
        }

        if (currentFiber != null) {
            deleteRemainingChildren(returnFiber, currentFiber);
        }

        return null;
    }

}
function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps);
    clone.index = 0;
    clone.sibling = null;
    return clone;
}

function updateFragment(returnFiber: FiberNode, current: FiberNode | null, elements: any[], key: Key, existingChildren: ExistingChildren) {
    let fiber;
    if (!current || current.tag != Fragment) {
        fiber = createFiberFromFragment(elements, key);
    } else {
        existingChildren.delete(key);
        fiber = useFiber(current, elements);
    }

    fiber.return = returnFiber;
    return fiber;

}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildReconciler = ChildReconciler(false);