import { Props } from "shared/ReactTypes";

export type Container = Element;
export type Instance = Element;

export const createInstance = (type: string, props: Props): Instance => {
    const dom = document.createElement(type);
    const isEvent = (key: string) => key.startsWith("on");
    for (const key in props) {
        if (key === "children") {
            continue;
        }
        if (isEvent(key)) {
            const eventType = key.toLowerCase().substring(2);
            dom.addEventListener(eventType, props[key]);
        } else {
            dom.setAttribute(key === "className" ? "class" : key, props[key]);
        }
    }
    return dom;
}

export const createTextInstance = (text: string) => {
    return document.createTextNode(text);
}

export const appendInitialChild = (parent: Instance, child: Instance) => {
    parent.appendChild(child)
}

export const appendChildToContainer = appendInitialChild;