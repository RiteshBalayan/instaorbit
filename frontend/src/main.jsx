import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './Styles/index.css'
import { Provider } from 'react-redux';
import store, { isDaughter } from './Store/store';
import { listenForBroadcasts } from './Store/broadcastMiddleware';

/* If this is a daughter display tab, start listening for state from master */
if (isDaughter) {
  listenForBroadcasts(store);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
