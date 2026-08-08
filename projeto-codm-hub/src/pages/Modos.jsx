import React from 'react';
import { Target, Users, Trophy, Swords, ShieldAlert } from 'lucide-react';

export default function Modos() {
  const gameModes = [
    {
      id: 'mj',
      title: 'Multiplayer (MJ)',
      description: 'Partidas dinâmicas 5v5 nos modos Domínio, Local Localizado e Buscar & Destruir.',
      icon: Swords,
      color: 'from-amber-500 to-yellow-600',
      badge: 'Competitivo'
    },
    {
      id: 'br',
      title: 'Battle Royale (BR)',
      description: 'Sobreviva contra 100 jogadores no mapa isolado ou em Blackout. Solo, Duo ou Squad.',
      icon: Trophy,
      color: 'from-orange-500 to-red-600',
      badge: 'Sobrevivência'
    },
    {
      id: 'zombies',
      title: 'Modo Zumbis',
      description: 'Enfrente hordas de mortos-vivos cooperativamente em rodadas de sobrevivência.',
      icon: ShieldAlert,
      color: 'from-emerald-500 to-teal-700',
      badge: 'Coop'
    },
    {
      id: 'treino',
      title: 'Sala de Treinamento',
      description: 'Ajuste sua sensibilidade, recuo de armas e movimentação antes de ir pras ranqueadas.',
      icon: Target,
      color: 'from-blue-500 to-indigo-600',
      badge: 'Prática'
    }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-viking-gold tracking-wide">MODOS DE JOGO</h1>
        <p className="text-gray-400 mt-1">Escolha sua arena e mostre suas habilidades no VIKING Hub.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gameModes.map((mode) => {
          const Icon = mode.icon;
          return (
            <div 
              key={mode.id}
              className="bg-viking-card rounded-2xl p-6 border border-gray-800 hover:border-viking-gold/50 transition-all duration-300 shadow-xl group relative overflow-hidden flex flex-col justify-between"
            >
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${mode.color}`} />
              
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${mode.color} text-black font-bold shadow-md`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 bg-gray-800 text-viking-gold rounded-full border border-gray-700">
                    {mode.badge}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-white group-hover:text-viking-gold transition-colors">
                  {mode.title}
                </h2>
                <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                  {mode.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-500">Salas e Campeonatos Ativos</span>
                <button className="bg-gray-800 hover:bg-viking-gold hover:text-black text-gray-300 font-semibold text-xs px-4 py-2 rounded-lg transition-all duration-200">
                  Entrar na Fila
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}