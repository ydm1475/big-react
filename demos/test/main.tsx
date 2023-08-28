import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {

  const [num, setNum] = useState(() => 120);
  window.setNum = setNum;
  return (
    <div>
      {num === 3 ? <Child /> : num}
    </div>
  );
}

const Child = () => <span>big-react</span>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
