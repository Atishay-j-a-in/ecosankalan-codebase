import React from 'react';
import '../../styles/loader.css';

export default function Loader({ text = 'Loading data points…' }) {
  return (
    <div className="ecosankalan-loader-wrap">
      <div className="ecosankalan-loader-pulse">
        <span className="material-symbols-outlined">data_usage</span>
      </div>
      <p className="ecosankalan-loader-text">{text}</p>
    </div>
  );
}
