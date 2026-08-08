import React, { useState } from 'react';
import { 
  Trophy, Shield, Swords, Target, Brain, Share2, Medal, Users, 
  Flame, Award, Search, CheckCircle, Video, Play, TrendingUp, 
  UserPlus, MessageSquare, Zap, BarChart2, Star, Calendar, Flag,
  Crosshair, Radio, FileText, Check, Copy, ExternalLink, RefreshCw
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('career');
  const [copied, setCopied] = useState(false);

  // --- ESTADOS DOS RECURSOS DA COMUNIDADE ---
  // X1 / X2
  const [x1Challenges, setX1Challenges] = useState([
    { id: 1, p1: 'FALLK_OP', p2: 'João_Sniper', map: 'Shipment', mode: 'BO3 - Sniper', points: 100, status: 'Pendente Confirmação', winner: 'FALLK_OP' },
    { id: 2, p1: 'Ghost_BR', p2: 'Viking_X', map: 'Killhouse', mode: 'BO5 - SMG', points: 150, status: 'Concluído', winner: 'Ghost_BR' }
  ]);
  const [newX1, setNewX1] = useState({ opponent: '', map: 'Shipment', mode: 'BO3 - Sniper', points: 100 });

  // Desafios Semanais
  const [weeklyChallenges, setWeeklyChallenges] = useState([
    { id: 1, title: 'Faça 30 Kills com AK117', xp: 500, total: 30, current: 22, completed: false },
    { id: 2, title: 'Vença 3 partidas de X1 no Shipment', xp: 300, total: 3, current: 3, completed: true },
    { id: 3, title: 'Alcance 80+ no Score de Mira', xp: 150, total: 1, current: 1, completed: true }
  ]);

  // Feed da Rede Social
  const [posts, setPosts] = useState([
    { id: 1, author: 'FALLK_OP', clan: 'LOBARK', time: 'Há 2 horas', content: 'Clutch 1v3 insano no mapa Standoff na final da Scrim! 🚀🔥', videoUrl: 'Clip_Clutch_Standoff.mp4', likes: 24, comments: 5 },
    { id: 2, author: 'Viking_X', clan: 'VIKINGS', time: 'Há 4 horas', content: 'Procurando jogador SMG agressivo para completar a line de campeonato!', likes: 12, comments: 8 }
  ]);
  const [newPost, setNewPost] = useState('');

  // Análise Inteligente de Partida (Coach AI)
  const [matchData, setMatchData] = useState({ kills: 28, deaths: 12, damage: 3400, mode: 'Localizar e Destruir' });
  const [analysisResult, setAnalysisResult] = useState(null);

  // --- FUNÇÕES DE INTERAÇÃO ---
  const handleCopyProfile = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateX1 = (e) => {
    e.preventDefault();
    if (!newX1.opponent) return;
    setX1Challenges([
      { id: Date.now(), p1: 'FALLK_OP', p2: newX1.opponent, map: newX1.map, mode: newX1.mode, points: parseInt(newX1.points), status: 'Pendente Confirmação', winner: null },
      ...x1Challenges
    ]);
    setNewX1({ opponent: '', map: 'Shipment', mode: 'BO3 - Sniper', points: 100 });
  };

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosts([
      { id: Date.now(), author: 'FALLK_OP', clan: 'LOBARK', time: 'Agora mesmo', content: newPost, likes: 0, comments: 0 },
      ...posts
    ]);
    setNewPost('');
  };

  const runMatchAnalysis = () => {
    // Cálculo simulado inteligente baseado nos dados da partida
    const accuracy = Math.min(95, Math.floor((matchData.kills * 2.5) + 12));
    const decision = Math.min(90, Math.floor(100 - (matchData.deaths * 2.2)));
    const aggressiveness = Math.min(98, Math.floor((matchData.damage / 40)));
    const positioning = Math.floor((accuracy + decision) / 2 - 5);

    setAnalysisResult({
      accuracy,
      decision,
      aggressiveness,
      positioning,
      feedback: matchData.deaths > 10 
        ? "Você está entrando sozinho em situações 1v2/1v3 com frequência. Espere suporte de mídia da equipe."
        : "Ótimo controle de mapa! Foque em reter granadas para retakes no A/B."
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-12">
      {/* HEADER / NAVBAR */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-red-600 p-2 rounded-lg text-white font-black tracking-wider text-xl">
              CODM<span className="text-yellow-400">HUB</span>
            </div>
            <span className="text-xs text-slate-400 border border-slate-700 px-2 py-0.5 rounded">eSports Platform</span>
          </div>

          {/* NAVEGAÇÃO */}
          <nav className="flex flex-wrap gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button onClick={() => setActiveTab('career')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'career' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <UserPlus size={16} /> Carreira
            </button>
            <button onClick={() => setActiveTab('ranking')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'ranking' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Trophy size={16} /> Player Score
            </button>
            <button onClick={() => setActiveTab('x1')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'x1' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Swords size={16} /> Desafios X1
            </button>
            <button onClick={() => setActiveTab('challenges')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'challenges' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Flame size={16} /> Semanal
            </button>
            <button onClick={() => setActiveTab('coach')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'coach' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <Brain size={16} /> Coach AI
            </button>
            <button onClick={() => setActiveTab('feed')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'feed' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}>
              <MessageSquare size={16} /> Rede Social
            </button>
            <button onClick={() => setActiveTab('innovations')} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition ${activeTab === 'innovations' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-white'}`}>
              <Zap size={16} /> Inovações HUB
            </button>
          </nav>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 mt-6">

        {/* 1. SISTEMA DE CARREIRA E PERFIL COMPLETO */}
        {activeTab === 'career' && (
          <div className="space-y-6">
            {/* CARDE DE IDENTIDADE COMPETITIVA */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-red-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Shield size={220} className="text-red-500" />
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-red-600 to-amber-500 p-1">
                      <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center text-3xl font-black text-amber-400">
                        FLK
                      </div>
                    </div>
                    <span className="absolute -bottom-2 -right-2 bg-yellow-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full border border-slate-900">
                      LVL 47
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-3xl font-extrabold text-white">FALLK_OP</h1>
                      <CheckCircle size={20} className="text-blue-400" title="Jogador Verificado" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                      <span className="text-red-400 font-bold bg-red-950/60 border border-red-800/50 px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <Shield size={14} /> CLÃ LOBARK
                      </span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Flame size={14} className="text-amber-500" /> Estilo: <strong className="text-slate-200">Aggressive / SMG</strong>
                      </span>
                      <span className="text-yellow-400 flex items-center gap-1 font-bold">
                        ★ 4.9/5 <span className="text-slate-500 font-normal">(48 avaliações)</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* PAINEL DE PERFORMANCE RÁPIDA */}
                <div className="flex flex-wrap items-center gap-4 bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl w-full md:w-auto justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block uppercase font-bold">Player Score</span>
                    <span className="text-2xl font-black text-amber-400 flex items-center gap-1">
                      <Zap size={18} fill="currentColor" /> 8.742
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <div>
                    <span className="text-xs text-slate-400 block uppercase font-bold">Sequência</span>
                    <span className="text-2xl font-black text-emerald-400 flex items-center gap-1">
                      <Flame size={18} fill="currentColor" /> 12 WINS
                    </span>
                  </div>
                  <div className="w-px h-8 bg-slate-800" />
                  <button 
                    onClick={handleCopyProfile}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition shadow-lg shadow-red-900/20"
                  >
                    {copied ? <Check size={16} /> : <Share2 size={16} />}
                    {copied ? 'Link Copiado!' : 'Compartilhar Card'}
                  </button>
                </div>
              </div>
            </div>

            {/* GRID DE ESTATÍSTICAS E CURRÍCULO COMPETITIVO */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* HISTÓRICO & ESTATÍSTICAS TÉCNICAS */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
                  <BarChart2 className="text-red-500" size={20} /> Estatísticas do Perfil
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">K/D Geral</span>
                    <p className="text-xl font-bold text-slate-100">2.41</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Taxa de Vitória</span>
                    <p className="text-xl font-bold text-emerald-400">68.4%</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Arma Favorita</span>
                    <p className="text-xl font-bold text-amber-400">CBR4 / Switchblade</p>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-xs text-slate-400">Mapa Favorito</span>
                    <p className="text-xl font-bold text-slate-100">Standoff</p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="text-xs text-slate-400 block mb-2 font-semibold">Rank Atual & Histórico</span>
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="font-extrabold text-purple-400 flex items-center gap-2">
                      <Trophy size={16} /> Lendário (12.400 PTS)
                    </span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">6x Lendário</span>
                  </div>
                </div>
              </div>

              {/* CURRÍCULO COMPETITIVO */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
                  <Award className="text-amber-400" size={20} /> Currículo Competitivo
                </h2>
                <ul className="space-y-3">
                  <li className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-medium">Campeonatos de X1</span>
                    <span className="text-amber-400 font-black">🥇 3x Campeão</span>
                  </li>
                  <li className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-medium">Torneios de Clãs (5v5)</span>
                    <span className="text-slate-400 font-black">🥈 2x Vice-campeão</span>
                  </li>
                  <li className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-medium">Torneios Disputados</span>
                    <span className="text-slate-100 font-black">17 Torneios</span>
                  </li>
                  <li className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-300 font-medium">Partidas Competitivas</span>
                    <span className="text-slate-100 font-black">143 Jogos</span>
                  </li>
                </ul>
              </div>

              {/* CONQUISTAS & MEDALHAS */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-slate-200 border-b border-slate-800 pb-3">
                  <Medal className="text-emerald-400" size={20} /> Conquistas & Medalhas
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl mb-1">🎯</div>
                    <div className="text-xs font-bold text-slate-200">Rei do X1</div>
                    <div className="text-[10px] text-slate-500">10 vitórias em X1 BO3</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl mb-1">💣</div>
                    <div className="text-xs font-bold text-slate-200">Clutch Master</div>
                    <div className="text-[10px] text-slate-500">Venceu 5v1 em campeonato</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl mb-1">🔥</div>
                    <div className="text-xs font-bold text-slate-200">Incomparável</div>
                    <div className="text-[10px] text-slate-500">10+ Winstreak Ativo</div>
                  </div>
                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                    <div className="text-2xl mb-1">🛡️</div>
                    <div className="text-xs font-bold text-slate-200">Capitão Lobark</div>
                    <div className="text-[10px] text-slate-500">Líder de line ativa</div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 2. RANKING BASEADO EM PLAYER SCORE */}
        {activeTab === 'ranking' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Trophy className="text-amber-400" /> Ranking Global por Player Score
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                A pontuação é calculada de forma justa: Vitórias + Desempenho + Objetivos + Sequência + Nível de Adversários.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase bg-slate-950/50">
                    <th className="p-3">Posição</th>
                    <th className="p-3">Jogador</th>
                    <th className="p-3">Clã</th>
                    <th className="p-3">Player Score</th>
                    <th className="p-3">K/D</th>
                    <th className="p-3">Winstreak</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50 text-sm">
                  <tr className="bg-amber-950/20 hover:bg-slate-850 transition">
                    <td className="p-3 font-black text-amber-400">#1</td>
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">1</div>
                      FALLK_OP
                    </td>
                    <td className="p-3 text-red-400 font-semibold">LOBARK</td>
                    <td className="p-3 font-black text-amber-400">8.742</td>
                    <td className="p-3 text-slate-300">2.41</td>
                    <td className="p-3 text-emerald-400 font-bold">12 🔥</td>
                    <td className="p-3"><span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs px-2 py-0.5 rounded">Procurando Time</span></td>
                  </tr>
                  <tr className="hover:bg-slate-850 transition">
                    <td className="p-3 font-black text-slate-400">#2</td>
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-slate-700 text-slate-200 font-black flex items-center justify-center text-xs">2</div>
                      Viking_X
                    </td>
                    <td className="p-3 text-blue-400 font-semibold">VIKINGS</td>
                    <td className="p-3 font-black text-amber-400">8.510</td>
                    <td className="p-3 text-slate-300">2.18</td>
                    <td className="p-3 text-emerald-400 font-bold">5 🔥</td>
                    <td className="p-3"><span className="bg-slate-800 text-slate-400 text-xs px-2 py-0.5 rounded">Em Line</span></td>
                  </tr>
                  <tr className="hover:bg-slate-850 transition">
                    <td className="p-3 font-black text-amber-700">#3</td>
                    <td className="p-3 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-amber-800 text-amber-100 font-black flex items-center justify-center text-xs">3</div>
                      João_Sniper
                    </td>
                    <td className="p-3 text-slate-400 font-semibold">Sem Clã</td>
                    <td className="p-3 font-black text-amber-400">8.120</td>
                    <td className="p-3 text-slate-300">2.89</td>
                    <td className="p-3 text-slate-400">2</td>
                    <td className="p-3"><span className="bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs px-2 py-0.5 rounded">Procurando Time</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. SISTEMA DE X1 / X2 COM DESAFIOS */}
        {activeTab === 'x1' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* FORMULÁRIO DE DESAFIO */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Swords className="text-red-500" size={20} /> Desafiar Jogador
              </h2>
              <form onSubmit={handleCreateX1} className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Nick do Adversário</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João_Sniper" 
                    value={newX1.opponent}
                    onChange={(e) => setNewX1({...newX1, opponent: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mapa</label>
                  <select 
                    value={newX1.map}
                    onChange={(e) => setNewX1({...newX1, map: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="Shipment">Shipment</option>
                    <option value="Killhouse">Killhouse</option>
                    <option value="Rust">Rust</option>
                    <option value="Firing Range">Firing Range</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Modo / Regras</label>
                  <select 
                    value={newX1.mode}
                    onChange={(e) => setNewX1({...newX1, mode: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                  >
                    <option value="BO3 - Sniper">BO3 - Apenas Sniper</option>
                    <option value="BO5 - SMG">BO5 - Apenas SMG</option>
                    <option value="BO3 - Livre">BO3 - Armas Libres</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Valendo Pontos</label>
                  <input 
                    type="number" 
                    value={newX1.points}
                    onChange={(e) => setNewX1({...newX1, points: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition text-sm">
                  Emitir Desafio X1
                </button>
              </form>
            </div>

            {/* LISTA DE DESAFIOS ATIVOS */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Trophy className="text-amber-400" size={20} /> Desafios da Liga de X1
              </h2>
              <div className="space-y-3">
                {x1Challenges.map((item) => (
                  <div key={item.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-base font-black text-white">
                        <span>{item.p1}</span>
                        <span className="text-red-500 font-normal text-xs px-2 py-0.5 bg-red-950 rounded border border-red-800">VS</span>
                        <span>{item.p2}</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex gap-3">
                        <span>📍 {item.map}</span>
                        <span>🎮 {item.mode}</span>
                        <span className="text-amber-400 font-bold">🏆 Valendo {item.points} PTS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
                      <span className={`text-xs px-2.5 py-1 rounded font-bold ${item.status === 'Concluído' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                        {item.status}
                      </span>
                      {item.status !== 'Concluído' && (
                        <button className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg text-slate-200 transition">
                          Confirmar Resultado
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. DESAFIOS DA COMUNIDADE */}
        {activeTab === 'challenges' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-2">
                <Flame className="text-amber-500" /> Desafios da Semana
              </h2>
              <p className="text-slate-400 text-sm mt-1">Conclua as missões comunitárias para ganhar XP e selos exclusivos no seu perfil.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {weeklyChallenges.map((c) => (
                <div key={c.id} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-200 text-sm">{c.title}</h3>
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 text-xs px-2 py-0.5 rounded font-black">
                      +{c.xp} XP
                    </span>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Progresso</span>
                      <span>{c.current} / {c.total}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-red-600 to-amber-500 h-full rounded-full" 
                        style={{ width: `${(c.current / c.total) * 100}%` }}
                      />
                    </div>
                  </div>

                  <button className={`w-full py-2 rounded-xl text-xs font-bold transition ${c.completed ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'}`}>
                    {c.completed ? '✓ Concluído & Recompensado' : 'Enviar Prova (Print/Vídeo)'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. ANÁLISE INTELIGENTE DE PARTIDAS (COACH AI) */}
        {activeTab === 'coach' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                <Brain className="text-purple-400" size={20} /> Entrar Dados da Partida
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kills na Partida</label>
                  <input 
                    type="number" 
                    value={matchData.kills}
                    onChange={(e) => setMatchData({...matchData, kills: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Mortes (Deaths)</label>
                  <input 
                    type="number" 
                    value={matchData.deaths}
                    onChange={(e) => setMatchData({...matchData, deaths: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Dano Causado Total</label>
                  <input 
                    type="number" 
                    value={matchData.damage}
                    onChange={(e) => setMatchData({...matchData, damage: parseInt(e.target.value) || 0})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white"
                  />
                </div>
                <button 
                  onClick={runMatchAnalysis}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2"
                >
                  <Brain size={16} /> Gerar Análise de Coach AI
                </button>
              </div>
            </div>

            {/* PAINEL DE RESULTADOS DO COACH AI */}
            <div className="md:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
              <h2 className="text-xl font-bold text-slate-100 border-b border-slate-800 pb-3 flex items-center gap-2">
                <Target className="text-red-500" /> Relatório Tático do Coach Digital
              </h2>

              {analysisResult ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">🎯 Mira</span>
                      <span className="text-2xl font-black text-amber-400">{analysisResult.accuracy}/100</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">🧠 Tomada Decisão</span>
                      <span className="text-2xl font-black text-blue-400">{analysisResult.decision}/100</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">⚔️ Agressividade</span>
                      <span className="text-2xl font-black text-red-400">{analysisResult.aggressiveness}/100</span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                      <span className="text-xs text-slate-400 block">🛡️ Posicionamento</span>
                      <span className="text-2xl font-black text-emerald-400">{analysisResult.positioning}/100</span>
                    </div>
                  </div>

                  <div className="bg-slate-950 p-4 rounded-xl border-l-4 border-purple-500 space-y-1">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">Diagnóstico Tático Principal</span>
                    <p className="text-slate-200 text-sm font-medium">{analysisResult.feedback}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Brain size={48} className="mx-auto mb-2 opacity-30" />
                  <p>Insira os dados da partida e clique em gerar para receber o feedback do Coach AI.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. REDE SOCIAL DO CODM (HUB COMMUNITY) */}
        {activeTab === 'feed' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* CRIAR POST */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-3">
              <form onSubmit={handleCreatePost} className="space-y-3">
                <textarea 
                  rows="3"
                  placeholder="Compartilhe um clip, procure uma line ou poste sua última vitória..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-600 resize-none"
                />
                <div className="flex justify-between items-center">
                  <button type="button" className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1">
                    <Video size={14} /> Anexar Clip (MP4)
                  </button>
                  <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-1.5 rounded-xl text-sm transition">
                    Publicar
                  </button>
                </div>
              </form>
            </div>

            {/* FEED DE POSTS */}
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                        {post.author.slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-100 text-sm">{post.author}</span>
                          <span className="text-xs font-bold text-red-400 bg-red-950 px-2 py-0.5 rounded border border-red-800">{post.clan}</span>
                        </div>
                        <span className="text-[10px] text-slate-500">{post.time}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-slate-200 text-sm">{post.content}</p>

                  {post.videoUrl && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center text-slate-500 flex flex-col items-center justify-center gap-2">
                      <Play size={32} className="text-red-500" />
                      <span className="text-xs font-medium text-slate-400">Clip anexado: {post.videoUrl}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-6 border-t border-slate-800/80 pt-3 text-xs text-slate-400">
                    <button className="flex items-center gap-1 hover:text-red-400 transition">
                      🔥 {post.likes} Reações
                    </button>
                    <button className="flex items-center gap-1 hover:text-slate-200 transition">
                      💬 {post.comments} Comentários
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 7. AS 10 IDEIAS DE INOVAÇÃO EXCLUSIVAS DO HUB */}
        {activeTab === 'innovations' && (
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div>
              <h2 className="text-2xl font-black text-amber-400 flex items-center gap-2">
                <Zap className="text-amber-400" /> 10 Ideias de Inovação Exclusivas para o CODM HUB
              </h2>
              <p className="text-slate-400 text-sm mt-1">Recursos inéditos no ecossistema competitivo de Call of Duty Mobile para dominar a comunidade.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">1. ⚡ Scout de Lines & Mercado de Transferências</h3>
                <p className="text-slate-400 text-xs">Aba onde times publicam vagas (ex: "Procuro SMG Entry") e jogadores declaram status "Free Agent" com seus cards de estatísticas.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">2. 🛡️ Sistema Anti-Falso Resultado (Dupla Validação)</h3>
                <p className="text-slate-400 text-xs">Os dois jogadores enviam o print do resultado pós-partida de X1. A plataforma compara e aprova o score automaticamente via IA visual.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">3. 🔫 Gunsmith Hub (Meta Loadouts da Comunidade)</h3>
                <p className="text-slate-400 text-xs">Jogadores compartilham combinações de acessórios para armas com notas e taxa de vitórias real registradas na plataforma.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">4. 🎙️ Sala de Caster / Transmissão de Campeonatos</h3>
                <p className="text-slate-400 text-xs">Integração com lives da Twitch/YouTube dentro das chaves de torneios para narradores da comunidade transmitirem os jogos ao vivo.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">5. 🏆 Sistema MVT (Most Valuable Team) Mensal</h3>
                <p className="text-slate-400 text-xs">Ranking exclusivo para Clãs (como o LOBARK) somando a pontuação de todos os membros em scrims e campeonatos.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">6. ⚔️ Sistema de Apostas por Pontos Internos (HubCoins)</h3>
                <p className="text-slate-400 text-xs">Pontos virtuais acumulados via missões semanais para apostar em partidas oficiais de times Pro sem envolver dinheiro real.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">7. 🗺️ Radar de Veto de Mapas Automatizado</h3>
                <p className="text-slate-400 text-xs">Ferramenta integrada de Ban/Pick de mapas para partidas competitivas no formato 5v5 antes de iniciar a sala privada.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">8. 🏷️ Selo de Fair Play & Reputação Antitóxico</h3>
                <p className="text-slate-400 text-xs">Jogadores que jogam limpo e confirmam partidas sem criar brigas acumulam estrelas de reputação visíveis no card social.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">9. 🎬 Montagem Automática de Highlights</h3>
                <p className="text-slate-400 text-xs">Gerador de cards animados de vitórias para postar no Instagram Stories e TikTok com 1 clique.</p>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-1">
                <h3 className="font-bold text-white text-base flex items-center gap-2">10. 🏅 Hall da Fama da Temporada</h3>
                <p className="text-slate-400 text-xs">Mural eterno registrando os campeões de cada temporada para imortalizar os melhores jogadores no ecossistema.</p>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}