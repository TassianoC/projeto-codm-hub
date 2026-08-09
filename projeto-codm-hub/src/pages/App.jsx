import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Modos from './pages/Modos';
import Perfil from './pages/Perfil';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-viking-dark text-white selection:bg-viking-gold selection:text-black">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/modos" element={<Modos />} />
            <Route path="/perfil" element={<Perfil />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}