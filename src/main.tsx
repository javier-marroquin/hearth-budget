import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import './styles/grid-layout.css';
import './styles/globals.css';
import './i18n';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
