import './style.css';

const root = document.querySelector('#root');
import {
  unstable_ImmediatePriority as ImmediatePriority,
  unstable_UserBlockingPriority as UserBlockingPriority,
  unstable_NormalPriority as NormalPriority,
  unstable_LowPriority as LowPriority,
  unstable_IdlePriority as IdlePriority,
  unstable_scheduleCallback as scheduleCallback,
  unstable_shouldYield as shouldYield,
  CallbackNode,
  unstable_getFirstCallbackNode as getFirstCallbackNode,
  unstable_cancelCallback as cancelCallback
} from 'scheduler';


type Priority =
  typeof ImmediatePriority
  | typeof UserBlockingPriority
  | typeof NormalPriority
  | typeof LowPriority
  | typeof IdlePriority;
interface Work {
  count: number;
  priority: Priority;
}

[ImmediatePriority, UserBlockingPriority, NormalPriority, LowPriority].forEach((priority, i) => {
  const button = document.createElement('button');
  button.innerText = ['ImmediatePriority', 'UserBlockingPriority', 'NormalPriority', 'LowPriority'][i];
  root?.appendChild(button);
  button.onclick = () => {
    workList.unshift({
      count: 100,
      priority: priority as Priority
    });
    schedule();
  }
})

let prevPriority: Priority = IdlePriority;
let curCallback: CallbackNode | null = null;
const workList: Work[] = [];

function schedule() {
  const cbNode = getFirstCallbackNode();
  const curWork = workList.sort((w1, w2) => w1.priority - w2.priority)[0];

  if (!curWork) {
    curCallback = null;
    cbNode && cancelCallback(cbNode);
    return;
  }
  // TODO: 策略逻辑
  const { priority: curPriority } = curWork;
  if (curPriority === prevPriority) {
    return;
  }
  // 更高优先级work
  cbNode && cancelCallback(cbNode);
  curCallback = scheduleCallback(curPriority, perform.bind(null, curWork))
}

function perform(work: Work, didTimeout?: boolean): any {

  const neesSync = work.priority === ImmediatePriority || didTimeout;
  while ((neesSync || !shouldYield()) && work.count) {
    work.count--;
    insertSpan(work.priority + '');
  }

  prevPriority = work.priority;
  if (!work.count) {
    const workIndex = workList.indexOf(work);
    workList.splice(workIndex, 1);
    prevPriority = IdlePriority;

  }
  const preCallback = curCallback;

  schedule();
  const newCallback = curCallback;

  if (newCallback && newCallback === preCallback) {
    return perform.bind(null, work);
  }

}

function insertSpan(content: string) {
  const span = document.createElement('span');
  span.innerText = content;
  span.className = `pri-${content}`
  doSomeBuzyWork(10000000);
  root?.appendChild(span);
}

function doSomeBuzyWork(len: number) {
  let res = 0;
  while (len--) {
    res += len;
  }
}