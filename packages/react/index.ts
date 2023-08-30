import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher";
import { jsx, jsxDEV, isValidElement as validElement } from "./src/jsx";
import currentDispatcher from './src/currentDispatcher'
import currentBatchConfig from './src/currentBatchConfig';

export const useState: Dispatcher['useState'] = (initialState: any) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState)

}
export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps)

}

export const useRef: Dispatcher['useRef'] = (initialValue: any) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useRef(initialValue);
}

export const useReducer: Dispatcher['useReducer'] = (reducer: any, initialArg: any, init: any) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useReducer(reducer, initialArg, init);
}


export const useTransition: Dispatcher['useTransition'] = () => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useTransition();
}

// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    currentDispatcher,
    currentBatchConfig
}

export const version = '0.0.0';
export const createElement = jsx;
export const isValidElement = validElement;

export default {
    version: '0.0.0',
    createElement: jsx,
}