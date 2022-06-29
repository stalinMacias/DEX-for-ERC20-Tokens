import React from 'react';
import ReactDOM from 'react-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './scss/index.scss';
import LoadingContainer from './LoadingContainer';

ReactDOM.render(
  <React.StrictMode>
    <LoadingContainer />
  </React.StrictMode>, 
  document.getElementById('root')
);