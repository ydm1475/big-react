import { Props, ReactElement } from "shared/ReactTypes";
import { FiberNode, createFiberFromElement, createWorkInProgress } from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { HostText } from "./workTags";
import { ChildDeletion, Placement, Update } from "./fiberFlag";

function ChildReconciler(shouldTrackEffects: boolean) {

    function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
        if (!shouldTrackEffects) {
            return;
        }
        console.log('000');

        const deletions = returnFiber.deletions;
        if (deletions === null) {
            returnFiber.deletions = [childToDelete];
            returnFiber.flags |= ChildDeletion;
        } else {
            deletions.push(childToDelete);
        }
    }
    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        // 根据reactElement创建一个filber并返回
        const key = element.key;
        work: if (currentFiber != null) {
            // 更新
            if (currentFiber.key === key) {
                // key相同
                if (element.$$typeof === REACT_ELEMENT_TYPE) {
                    if (currentFiber.type === element.type) {
                        // type 相同
                        const existing = useFiber(currentFiber, element.props);
                        existing.return = returnFiber;
                        return existing;
                    }
                    deleteChild(returnFiber, currentFiber);
                    break work;
                } else {
                    if (__DEV__) {
                        console.warn('还未实现的react类型', element);
                        break work;
                    }
                }
            } else {
                deleteChild(returnFiber, currentFiber);
            }
        }
        const fiber = createFiberFromElement(element);
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {

        if (currentFiber != null) {
            if (currentFiber.tag === HostText) {
                const existing = useFiber(currentFiber, { content });
                existing.return = returnFiber;
                return existing;
            }

            deleteChild(returnFiber, currentFiber);
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

    function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
        const clone = createWorkInProgress(fiber, pendingProps);
        clone.index = 0;
        clone.sibling = null;
        return clone;
    }

    return function reconcileChildFibers(returnFiber: FiberNode, currentFiber: FiberNode | null, newChild?: ReactElement) {
        if (typeof newChild === 'object' && newChild !== null) {
            switch (newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(reconcileSingleElement(returnFiber, currentFiber, newChild));

                default:
                    if (__DEV__) {
                        console.warn('未实现的reconciler类型', newChild);
                    }
                    break;
            }
        }


        // 多节点情况
        // 文本节点
        if (typeof newChild == "string" || typeof newChild == "number") {
            return placeSingleChild(reconcileSingleTextNode(returnFiber, currentFiber, newChild));
        }

        // if (currentFiber != null) {
        //     deleteChild(returnFiber, currentFiber);
        // }

        return null;
    }

}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildReconciler = ChildReconciler(false);