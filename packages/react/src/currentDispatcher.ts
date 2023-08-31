import { Action } from "shared/ReactTypes";

export type Reducer = (preValue: any, action: any) => void
export interface Dispatcher {
    useState: <T>(initialState: (() => T) | T) => [T, Dispatch<T>];
    useEffect: (create: () => void, deps: any[] | null) => void;
    useRef: <T>(initialValue: T) => { current: T };
    useReducer: <T>(reducer: Reducer, initialArg: T, init: () => void) => [T, Dispatch<T>],
    useTransition: () => [boolean, (callback: () => void) => void];
    useMemo: (create: (...args: any) => void, deps: any[] | null) => void;
    useCallback: (callback: (...args: any) => void, deps: any[] | null) => void;
}
export type Dispatch<State> = (action: Action<State>) => void;

const currentDispatcher: { current: Dispatcher | null } = {
    current: null
}

export const resolveDispatcher = (): Dispatcher => {
    const dispatcher = currentDispatcher.current;
    if (dispatcher == null) {
        throw new Error('hook只能在函数组件中执行')
    }

    return dispatcher;
}

export default currentDispatcher;