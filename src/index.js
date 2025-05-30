import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';           // Your global CSS styles
import 'bootstrap/dist/css/bootstrap.min.css';  // Bootstrap CSS

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
