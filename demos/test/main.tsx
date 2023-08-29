import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {

  const [num, setNum] = useState(120);

  const handleClick = () => {
    setTimeout(() => {
      setNum((num) => num + 1);
      setNum((num) => num + 2);
      setNum((num) => num + 3);
    }, 10)
  }

  const handleClick2 = () => {

    setTimeout(() => {
      setNum((num) => num + 4);
      setNum((num) => num + 5);
    }, 10)
  }



  console.log('num', num);
  return (
    <ul onClick={handleClick}>
      <>
        1212
      </>
      <li onClick={handleClick2}>测试批量123{num}</li>
    </ul>
  )
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
