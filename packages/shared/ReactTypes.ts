export type Props = {
    [key: string]: any;
    children?: any;
};
export type Key = any;
export type Ref = { current: any } | ((instance: any) => void) | null;
export type Type = any;
export type ElementType = any;

export interface ReactElement {
    $$typeof: symbol | number;
    key: Key;
    ref: Ref;
    type: Type;
    props: Props,
    __mark: string;
}

export type Action<State> = State | ((prevState: State) => State)