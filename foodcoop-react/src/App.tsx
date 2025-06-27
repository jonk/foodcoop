import { useState } from 'react'
import './App.css'

function App() {

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h2>Settings</h2>
        <p>Notifications are going to jonk1993@gmail.com</p>
        <button>Logout</button>
      </aside>

      <main className="content">
        <h1>Food Coop Checker</h1>
        <button>Add Shift</button>

      </main>
    </div>
  );
}

export default App
