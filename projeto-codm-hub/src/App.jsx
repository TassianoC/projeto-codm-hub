import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';

// Componentes temporários para Modos e Perfil
const Modos = () => <div className="p-8 text-center text-xl">Página de Modos de Jogo</div>;
const Perfil = () => <div className="p-8 text-center text-xl">Página de Perfil do Jogador</div>;

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-viking-dark text-white">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/modos" element={<Modos />} />
          <Route path="/perfil" element={<Perfil />} />
        </Routes>
      </div>
    </Router>
  );
}