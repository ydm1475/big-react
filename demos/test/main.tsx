import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'

const App = () => {

  const [num] = useState(() => 120);
  console.log(num);
  return (
    <div>
      {num}
    </div>
  );
}

const Child = () => <span>big-react</span>;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
