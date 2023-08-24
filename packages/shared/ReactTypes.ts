export type Props = any;
export type Key = any;
export type Ref = any;
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