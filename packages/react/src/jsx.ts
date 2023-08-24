import { REACT_ELEMENT_TYPE } from ".././../shared/ReactSymbols";
import { ElementType, Key, Props, ReactElement, Ref, Type } from "../../shared/ReactTypes";

const ReactElement = function (type: Type, key: Key, ref: Ref, props: Props): ReactElement {
    const element = {
        $$typeof: REACT_ELEMENT_TYPE,
        key,
        type,
        ref,
        props,
        __mark: 'YDM'
    }
    return element;
}


export const jsx = (type: ElementType, config: Props, ...children: any) => {
    let key: Key = null;
    const props: Props = {};
    let ref: Ref = null;

    for (const prop in config) {
        var val = config[prop];
        if (prop === 'key') {
            if (val != undefined) {
                key = "" + val;
            }
            continue;

        }

        if (prop === 'ref') {
            if (val != undefined) {
                ref = val;
            }
            continue;
        }

        if (Object.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }
    const childrenLenth = children.length;
    if (childrenLenth === 1) {
        props.children = children[0];
    } else {
        props.children = children;
    }
    console.log('type2', key, ref, props);

    return ReactElement(type, key, ref, props);

}


export const jsxDEV = (type: ElementType, config: Props) => {
    console.log('1231');
    let key: Key = null;
    const props: Props = {};
    let ref: Ref = null;

    for (const prop in config) {
        var val = config[prop];
        if (prop === 'key') {
            if (val != undefined) {
                key = "" + val;
            }
            continue;

        }

        if (prop === 'ref') {
            if (val != undefined) {
                ref = val;
            }
            continue;
        }

        if (Object.hasOwnProperty.call(config, prop)) {
            props[prop] = val;
        }
    }

    return ReactElement(type, key, ref, props);

};