import { ReactElement } from "shared/ReactTypes";
import { FiberNode, createFiberFromElement } from "./fiber";
import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { HostText } from "./workTags";
import { Placement } from "./fiberFlag";

function ChildReconciler(shouldTrackEffects: boolean) {
    function reconcileSingleElement(returnFiber: FiberNode, currentFiber: FiberNode | null, element: ReactElement) {
        // 根据reactElement创建一个filber并返回
        const fiber = createFiberFromElement(element);
        fiber.return = returnFiber;
        return fiber;
    }

    function reconcileSingleTextNode(returnFiber: FiberNode, currentFiber: FiberNode | null, content: string | number) {
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

        return null;
    }

}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildReconciler = ChildReconciler(false);