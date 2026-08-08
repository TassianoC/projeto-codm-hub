import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Gamepad2, User, Home } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="bg-viking-card border-b border-gray-800 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Shield className="w-8 h-8 text-viking-gold" />
        <span className="font-bold text-xl tracking-wider text-viking-gold">VIKING HUB</span>
      </div>
      
      <div className="flex space-x-6">
        <Link to="/" className="flex items-center space-x-2 text-gray-300 hover:text-viking-gold transition">
          <Home className="w-5 h-5" />
          <span>Início</span>
        </Link>
        <Link to="/modos" className="flex items-center space-x-2 text-gray-300 hover:text-viking-gold transition">
          <Gamepad2 className="w-5 h-5" />
          <span>Modos</span>
        </Link>
        <Link to="/perfil" className="flex items-center space-x-2 text-gray-300 hover:text-viking-gold transition">
          <User className="w-5 h-5" />
          <span>Perfil</span>
        </Link>
      </div>
    </nav>
  );
}