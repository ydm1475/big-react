import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {

  const [num, setNum] = useState(120);

  const handleClick = () => {
    setNum(num + 1);
  }


  const arr = num % 2 === 0 ? [
    <li key='1'>1</li>,
    <li key='2'>2</li>,
    <li key='3'>3</li>,
  ] : [
    <li key='3'>3</li>,
    <li key='2'>2</li>,
    <li key='1'>1</li>,
  ];
  return (
    <ul onClick={handleClick} key='123'>
      {arr}
    </ul>
  );
}

const Child = () => <span>big-react</span>;
const a1 = (
  <ul key='789' title='100'>
    <li key='1'>1</li>
    <li key='2'>2</li>
    <li key='3'>3</li>
  </ul>
)
ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
