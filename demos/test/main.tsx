import React, { useEffect, useRef, useState, useReducer } from 'react'
import ReactDOM from 'react-dom/client';

// const App = () => {

//   const [num, setNum] = useState(100);

//   const handleClick = () => {
//     setNum((num) => num + 4);
//     setNum((num) => num + 5);
//   }

//   const handleClick2 = () => {
//     setNum((num) => num + 1);
//     setNum((num) => num + 2);
//     setNum((num) => num + 3);
//   }
//   useEffect(() => {
//     console.log('9999');
//   }, [])

//   useEffect(() => {
//     console.log('8899');
//   }, [])

//   useEffect(() => {
//     console.log('++++++++');
//   }, [])


//   return (
//     <ul onClick={handleClick} key='123'>
//       {arr}
//     </ul>
//   );
// }

// const Child = () => <span>big-react</span>;
// const a1 = (
//   <ul key='789' title='100'>
//     <li key='1'>1</li>
//     <li key='2'>2</li>
//     <li key='3'>3</li>
//   </ul>
// )



function App() {
  const [isDel, del] = useState(0);
  const divRef = useRef(null);
  console.log('ref', divRef.current);
  useEffect(() => {
    console.log('current', divRef.current);
  });
  return (
    <div ref={divRef} onClick={() => del(true)}>
      {isDel ? '123' : <Child />}
    </div>
  );
}

function Child() {
  return <p ref={(dom) => console.log('dom is', dom)}>i am child.</p>;
}


function reducer(state, action) {
  if (action.type === 'incremented_age') {
    return {
      age: state.age + 1
    };
  }
  throw Error('Unknown action.');
}

export default function Counter() {
  const [state, dispatch] = useReducer(reducer, { age: 42 });
  const [num, setNum] = useState(10);

  return (
    <>
      <button onClick={() => {
        dispatch({ type: 'incremented_age' })
        setNum(num => num + 1)
      }}>
        Increment age
      </button>
      <p>你好。你今年{state.age}岁-----儿子{num}岁</p>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Counter />
)