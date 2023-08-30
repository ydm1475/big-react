import { Container } from "hostConfig";
import { Props } from "shared/ReactTypes";
import 'scheduler';
import { unstable_ImmediatePriority, unstable_NormalPriority, unstable_UserBlockingPriority, unstable_runWithPriority } from "scheduler";
export const elementPropsKey = '__props';

const validEventTypeList = ['click'];

export interface DOMELement extends Element {
    [elementPropsKey]: Props;
}

type EventCallback = (e: Event) => void

interface SyntheticEvent extends Event {
    __stopPropagation: boolean
}
interface Paths {
    capture: EventCallback[],
    bubble: EventCallback[],
}

export function updateFiberProps(node: DOMELement, props: Props) {
    node[elementPropsKey] = props;
}


export function initEvent(container: Container, eventType: string) {
    if (!validEventTypeList.includes(eventType)) {
        console.warn('当前不支持', eventType, '事件');
    }

    if (__DEV__) {
        console.log("初始化事件：", eventType);
    }

    container.addEventListener(eventType, e => {

        dispatchEvent(container, eventType, e);
    })
}


function dispatchEvent(container: Container, eventType: string, e: Event) {
    // 收集沿途的事件
    // 构造合成事件
    // 遍历capture
    // 遍历bubble

    const targetElement = e.target;
    if (targetElement === null) {
        console.warn('事件不存在target', e);
        return;
    }

    // 收集沿途的事件
    const { capture, bubble } = collectPaths(targetElement as DOMELement, container, eventType);
    // 构造合成事件
    const se = createSyntheticEvent(e);
    // 遍历capture
    triggerEventFlow(capture, se);
    if (!se.__stopPropagation) {
        triggerEventFlow(bubble, se);
    }
}

function triggerEventFlow(paths: EventCallback[], se: SyntheticEvent) {
    for (let i = 0; i < paths.length; i++) {
        const callback = paths[i];
        unstable_runWithPriority(eventTypeToSchdulerPriority(se.type), () => {
            callback.call(null, se);
        });

        if (se.__stopPropagation) {
            break;
        }
    }
}

function createSyntheticEvent(e: Event): SyntheticEvent {
    const syntheticEvent = e as SyntheticEvent;
    syntheticEvent.__stopPropagation = false;
    const originStopPropagation = e.stopPropagation;

    syntheticEvent.stopPropagation = () => {
        syntheticEvent.__stopPropagation = true;
        if (originStopPropagation) originStopPropagation();
    };
    return syntheticEvent;
}


function collectPaths(targetElement: DOMELement, container: Container, eventType: string) {
    const paths: Paths = {
        capture: [],
        bubble: []
    }

    while (targetElement && targetElement != container) {
        const elementProps = targetElement[elementPropsKey];
        if (elementProps) {
            const callbackNameList = getEventCallbackNameFromEventType(eventType);
            if (callbackNameList) {
                callbackNameList.forEach((callbackName, i) => {
                    const eventCallback = elementProps[callbackName];
                    if (eventCallback) {
                        if (i === 0) {
                            paths.capture.unshift(eventCallback)
                        } else {
                            paths.bubble.push(eventCallback);
                        }
                    }
                })
            }
        }
        targetElement = targetElement.parentNode as DOMELement;
    }

    return paths;
}

function getEventCallbackNameFromEventType(eventType: string): string[] | undefined {
    return {
        click: ['onClickCapture', 'onClick']
    }[eventType]
}


function eventTypeToSchdulerPriority(eventType: string) {
    switch (eventType) {
        case 'click':
        case 'keydown':
        case 'keyup':
            return unstable_ImmediatePriority;
        case 'scroll':
            return unstable_UserBlockingPriority;
        default:
            return unstable_NormalPriority;
    }
}

