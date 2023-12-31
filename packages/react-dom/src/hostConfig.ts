import { FiberNode } from "react-reconciler/src/fiber";
import { HostComponent, HostText } from "react-reconciler/src/workTags";
import { Props } from "shared/ReactTypes";
import { DOMELement, updateFiberProps } from "./SyntheticEvent";

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

export const createInstance = (type: string, props: Props): Instance => {
    const dom = document.createElement(type) as any;
    updateFiberProps(dom as DOMELement, props);
    // const dom = document.createElement(type);
    // const isEvent = (key: string) => key.startsWith("on");
    // for (const key in props) {
    //     if (key === "children") {
    //         continue;
    //     }
    //     if (isEvent(key)) {
    //         const eventType = key.toLowerCase().substring(2);
    //         dom.addEventListener(eventType, props[key]);
    //     } else {
    //         dom.setAttribute(key === "className" ? "class" : key, props[key]);
    //     }
    // }

    return dom;
}

export const createTextInstance = (text: string) => {
    return document.createTextNode(text);
}

export const appendInitialChild = (parent: Instance, child: Instance) => {
    parent.appendChild(child)
}

export const appendChildToContainer = appendInitialChild;

export const commitUpdate = (fiber: FiberNode) => {
    switch (fiber.tag) {
        case HostText:
            const text = fiber.memoizedProps?.content;
            return commitTextUpdate(fiber.stateNode, text);
        case HostComponent:
            return updateFiberProps(fiber.stateNode, fiber.pendingProps);
        default:
            if (__DEV__) {
                console.warn("未实现的Update类型", fiber)
            }
            break;
    }
}


export function commitTextUpdate(textInstance: TextInstance, content: string) {
    textInstance.textContent = content;
    return textInstance;
}


export function removeChild(child: Instance | TextInstance, container: Container) {
    container.removeChild(child);
}

export function insertChildToContainer(child: Instance, container: Container, before: Instance) {
    container.insertBefore(child, before);
}


export const scheduleMicroTask =
    typeof queueMicrotask === "function"
        ? queueMicrotask
        : typeof Promise === "function"
            ? (callback: (...args: any) => void) => Promise.resolve(null).then(callback)
            : setTimeout