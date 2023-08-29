import { Dispatcher, resolveDispatcher } from "./src/currentDispatcher";
import { jsx, jsxDEV, isValidElement as validElement } from "./src/jsx";
import currentDispatcher from './src/currentDispatcher'


export const useState: Dispatcher['useState'] = (initialState: any) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useState(initialState)

}
export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
    const dispatcher = resolveDispatcher();
    return dispatcher.useEffect(create, deps)

}
// 内部数据共享层
export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
    currentDispatcher
}

export const version = '0.0.0';
export const createElement = jsx;
export const isValidElement = validElement;

export default {
    version: '0.0.0',
    createElement: jsx,
}