import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'

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
  const [num, updateNum] = useState(0);
  useEffect(() => {
    console.log("app, mount");
    updateNum(10);
  }, []);
  useEffect(() => {
    console.log("hello App3333");

    return () => {
      console.log("bye bye App");
    };
  }, [num]);

  console.log("num", num);
  return (
    <ul
      onClick={(e) => {
        updateNum((num) => num + 1);
      }}
    >
      你好{num}
      {num === 1 ? <div>123</div> : <Child />}
    </ul>
  );
}

function Child() {
  useEffect(() => {
    console.log('hello child');

    return () => {
      console.log('bye bye child');
    };
  });
  return <p>i am child.</p>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
