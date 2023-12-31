import { Key, Props, ReactElement, Ref } from 'shared/ReactTypes';
import { Fragment, FunctionComponent, HostComponent, WorkTag } from './workTags';
import { Flags, NoFlags } from './fiberFlag';
import { Container } from 'hostConfig';
import { REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Lane, Lanes, NoLane, NoLanes } from './fiberLanes';
import { Effect } from './fiberHooks';
import { CallbackNode } from 'scheduler';

export class FiberNode {
    tag: WorkTag;
    key: Key;
    stateNode: any;
    type: any;
    ref: Ref;

    return: FiberNode | null;
    sibling: FiberNode | null;
    child: FiberNode | null;
    index: number;

    pendingProps: Props;
    memoizedProps: Props | null;
    memoizedState: any;
    alternate: FiberNode | null;
    flags: Flags;
    // 
    subtreeFlags: Flags;
    updateQueue: unknown;
    hook: any;
    deletions: FiberNode[] | null;

    constructor(tag: WorkTag, pendingProps: Props, key: Key) {
        this.tag = tag;
        this.key = key;
        this.stateNode = null;
        this.type = null;

        // 表示节点之间的关系
        this.return = null;
        this.sibling = null;
        this.child = null;
        this.index = 0;

        this.ref = null;

        // 作为工作单元
        // 开始的props
        this.pendingProps = pendingProps;
        // 最终的props
        this.memoizedProps = null;
        this.memoizedState = null;
        this.alternate = null;
        //副作用标记
        this.flags = NoFlags;
        this.subtreeFlags = NoFlags;
        this.updateQueue = null;
        this.deletions = null;
    }
}

export interface PendingPassiveEffects {
    unmount: Effect[];
    update: Effect[];
}

export class FiberRootNode {
    container: Container;
    current: FiberNode;
    finshedWork: FiberNode | null;
    pendingLanes: Lanes;
    finishedLane: Lane;
    pendingPassiveEffects: PendingPassiveEffects;
    callbackNode: CallbackNode | null;
    callbackPriority: Lane;
    constructor(container: Container, hostRootFiber: FiberNode) {
        this.container = container;
        this.current = hostRootFiber;
        hostRootFiber.stateNode = this;
        this.finshedWork = null;
        this.pendingLanes = NoLanes;
        this.finishedLane = NoLane;
        this.callbackNode = null;
        this.callbackPriority = NoLane;
        this.pendingPassiveEffects = {
            unmount: [],
            update: []
        };
    }
}


export const createWorkInProgress = (current: FiberNode, pendingProps: Props): FiberNode => {
    let wip = current.alternate;

    if (wip === null) {
        // mount阶段
        wip = new FiberNode(current.tag, pendingProps, current.key);
        wip.stateNode = current.stateNode;
        wip.alternate = current;
        current.alternate = wip;
    } else {
        // update
        wip.pendingProps = pendingProps;
        wip.flags = NoFlags;
        wip.subtreeFlags = NoFlags;
        wip.deletions = null;

    }

    wip.type = current.type;
    wip.updateQueue = current.updateQueue;
    wip.child = current.child;
    wip.ref = current.ref;
    wip.memoizedProps = current.memoizedProps;
    wip.memoizedState = current.memoizedState;


    return wip;
}

export function createFiberFromElement(element: ReactElement): FiberNode {
    const { type, key, props, ref } = element;
    let fiberTag: WorkTag = FunctionComponent;
    if (typeof type == 'string') {
        fiberTag = HostComponent;
    } else if (typeof type != 'function' && __DEV__) {
        console.warn('未定义的type类型', element);
    }

    const fiber = new FiberNode(fiberTag, props, key);
    fiber.type = type;
    fiber.ref = ref;
    return fiber;
}


export function createFiberFromFragment(elements: any[], key: Key): FiberNode {
    const fiber = new FiberNode(Fragment, elements, key);
    fiber.type = REACT_FRAGMENT_TYPE;
    return fiber;
}