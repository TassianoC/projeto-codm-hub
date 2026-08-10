import React, { useState, useRef } from 'react';
import { 
  User, Image as ImageIcon, Video, PlusCircle, CheckCircle, Shield, 
  Trophy, MessageSquare, Play, Grid, Bookmark, Film, Upload, BarChart2, 
  Crosshair, Award, Zap, ChevronRight, Share2, Settings, ExternalLink, Trash2, Check
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'coach'
  const [profileSubTab, setProfileSubTab] = useState('grid'); // 'grid' | 'reels' | 'tagged'

  // --- ESTADOS DO PERFIL (INSTAGRAM STYLE) ---
  const [profile, setProfile] = useState({
    username: "Fallk Fps",
    verified: true,
    avatar: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=400&auto=format&fit=crop&q=80",
    role: "Gamer",
    titles: { gold: 6, silver: 2, bronze: 4 },
    bioQuote: "Na vida existe dois caminhos, no certo vc me encontra e no errado eu te acho",
    link: "youtube.com/channel/UCzrQ2802HEKd7Bpt4CVkQ...",
    followers: 489,
    following: 147,
  });

  // Feed do perfil (com imagens e vídeos)
  const [posts, setPosts] = useState([
    {
      id: 1,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Loadout atualizado para a season de COD Mobile 💥 #CODM',
      likes: 124,
      comments: 18
    },
    {
      id: 2,
      type: 'image',
      url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Design LOBARK em andamento 🐺 #GraphicDesign',
      likes: 89,
      comments: 7
    },
    {
      id: 3,
      type: 'video',
      url: 'https://assets.mixkit.co/videos/preview/mixkit-gameplay-of-a-first-person-shooter-41503-large.mp4',
      thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80',
      pinned: true,
      caption: 'Highlight de Sniper - Zona de Conflito em Shipment 🎯',
      likes: 210,
      comments: 34
    }
  ]);

  // Modal para novos posts no perfil
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [newPostUrl, setNewPostUrl] = useState('');
  const [newPostType, setNewPostType] = useState('image');
  const [newPostCaption, setNewPostCaption] = useState('');

  // --- ESTADOS DO COACH IA (4 PRINTS ESPECÍFICOS) ---
  const [coachScreenshots, setCoachScreenshots] = useState({
    impacto: null,   // Print 1: Relatório Detalhado (Score, KDA, B/M, Precisão)
    armamento: null, // Print 2: Armamento (Armas, Perks, Séries de Pontuação)
    objeto: null,    // Print 3: Pontuação de Objeto e Habilidades
    duelo: null      // Print 4: Matriz de Duelos individuais contra inimigos
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [verdict, setVerdict] = useState(null);

  // Manipular upload fictício/real dos 4 prints do Coach
  const handleScreenshotUpload = (type, e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCoachScreenshots(prev => ({ ...prev, [type]: url }));
    }
  };

  // Simular carregamento dos 4 prints do usuário
  const loadExampleScreenshots = () => {
    setCoachScreenshots({
      impacto: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=80",
      armamento: "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&auto=format&fit=crop&q=80",
      objeto: "https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&auto=format&fit=crop&q=80",
      duelo: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
    });
  };

  // Adicionar novo post no perfil
  const handleAddPost = (e) => {
    e.preventDefault();
    if (!newPostUrl) return;

    const newPost = {
      id: Date.now(),
      type: newPostType,
      url: newPostUrl,
      thumbnail: newPostType === 'video' ? 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=600&auto=format&fit=crop&q=80' : newPostUrl,
      pinned: false,
      caption: newPostCaption,
      likes: 0,
      comments: 0
    };

    setPosts([newPost, ...posts]);
    setNewPostUrl('');
    setNewPostCaption('');
    setShowNewPostModal(false);
  };

  // Executar Análise da IA do Coach com base nos 4 prints
  const runCoachAnalysis = () => {
    if (!coachScreenshots.impacto || !coachScreenshots.armamento || !coachScreenshots.objeto || !coachScreenshots.duelo) {
      alert("Por favor, envie ou carregue os 4 prints obrigatórios da partida para que a IA possa analisar corretamente!");
      return;
    }

    setAnalyzing(true);
    setVerdict(null);

    setTimeout(() => {
      setAnalyzing(false);
      setVerdict({
        overallRating: "S+",
        matchResult: "VITÓRIA (150 : 46) - Zona de Conflito (Shipment)",
        playerRole: "Aggressive Slayer / Anchor secundário",
        extractedStats: {
          kda: "60 / 18 / 9 (3.33 B/M)",
          score: "6887 (MVP da Partida)",
          accuracy: "25.2%",
          headshots: "6.7%",
          objScore: "1030 pts",
          objTime: "00:01"
        },
        loadoutAnalysis: {
          weapon: "FSS Hurricane + Pistola Automática",
          streaks: "Goliath XS1, Turret, UAV",
          verdictText: "Loadout otimizado para combate contínuo a curta distância. O alto volume de munição da FSS Hurricane casou perfeitamente com a densidade de inimigos em Shipment."
        },
        duelsAnalysis: [
          { enemy: "415HW8elekS", score: "16-6", status: "Dominado" },
          { enemy: "QING.JIU.LUKE", score: "11-7", status: "Vantagem" },
          { enemy: "JoelNina", score: "10-5", status: "Vantagem" },
          { enemy: "queasyqueen", score: "20-0", status: "Totalmente Neutralizado" }
        ],
        coachRecommendations: [
          "Seu tempo no objetivo foi de 00:01, mas sua pontuação de objeto foi 1030 graças às eliminações dentro da área. Como Slayer, seu papel foi cumprido com maestria ao manter os alvos longe da zona.",
          "Sua taxa de tiros na cabeça foi de 6.7%. Eleve o crosshair placement no mapa Shipment para atingir a meta recomendada de pelo menos 12%.",
          "Duelos individuais impecáveis: você anulou completamente o jogador 'queasyqueen' (20-0) e manteve K/D positivo contra todos os 4 adversários."
        ]
      });
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col font-sans">
      
      {/* HEADER PRINCIPAL / NAVEGAÇÃO DE ABAS */}
      <header className="sticky top-0 z-50 bg-gray-950 border-b border-gray-800 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="bg-red-600 text-white font-black px-2 py-1 rounded text-lg tracking-wider">FALLK</div>
          <span className="text-xs text-gray-400 font-semibold tracking-widest uppercase">Gaming Platform</span>
        </div>

        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'profile' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <User size={16} />
            <span>Perfil (Instagram)</span>
          </button>

          <button
            onClick={() => setActiveTab('coach')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === 'coach' ? 'bg-red-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={16} />
            <span>Coach IA</span>
          </button>
        </nav>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-2 sm:p-4">

        {/* ========================================================= */}
        {/* ABA DE PERFIL (ESTILO INSTAGRAM)                          */}
        {/* ========================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            
            {/* Top Bar do Perfil */}
            <div className="flex items-center justify-between pb-2 border-b border-gray-800">
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold">{profile.username}</h1>
                {profile.verified && <CheckCircle size={18} className="text-blue-500 fill-blue-500 text-black" />}
              </div>
              <div className="flex space-x-3 text-gray-300">
                <PlusCircle 
                  size={24} 
                  className="cursor-pointer hover:text-red-500 transition" 
                  onClick={() => setShowNewPostModal(true)}
                />
                <Settings size={24} className="cursor-pointer hover:text-white transition" />
              </div>
            </div>

            {/* Cabeçalho de Estatísticas e Avatar */}
            <div className="flex items-center justify-between py-2">
              <div className="relative">
                <img 
                  src={profile.avatar} 
                  alt="Avatar" 
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-red-600 object-cover p-0.5"
                />
                <button 
                  onClick={() => setShowNewPostModal(true)}
                  className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-1 border-2 border-black hover:bg-blue-500"
                >
                  <PlusCircle size={14} className="text-white" />
                </button>
              </div>

              <div className="flex space-x-6 sm:space-x-8 text-center pr-4">
                <div>
                  <div className="text-lg font-bold text-white">{posts.length}</div>
                  <div className="text-xs text-gray-400">posts</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{profile.followers}</div>
                  <div className="text-xs text-gray-400">seguidores</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-white">{profile.following}</div>
                  <div className="text-xs text-gray-400">seguindo</div>
                </div>
              </div>
            </div>

            {/* Bio e Medalhas */}
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-gray-200">{profile.role}</p>
              
              <div className="flex items-center space-x-2 text-xs py-0.5">
                <span className="text-gray-400">Titles:</span>
                <span className="flex items-center text-yellow-400">🥇x{profile.titles.gold}</span>
                <span className="flex items-center text-gray-300">🥈x{profile.titles.silver}</span>
                <span className="flex items-center text-amber-600">🥉x{profile.titles.bronze}</span>
              </div>

              <p className="text-gray-300 font-medium">👾 playing for ...</p>
              <p className="text-gray-300 italic">"{profile.bioQuote}"</p>
              
              <a 
                href={`https://${profile.link}`} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center space-x-1 text-blue-400 hover:underline text-xs"
              >
                <ExternalLink size={12} />
                <span>{profile.link}</span>
              </a>
            </div>

            {/* Botões de Ação do Perfil */}
            <div className="grid grid-cols-2 gap-2 py-2">
              <button className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 rounded-lg text-sm transition">
                Editar perfil
              </button>
              <button className="bg-gray-900 hover:bg-gray-800 text-white font-medium py-1.5 rounded-lg text-sm transition">
                Compartilhar perfil
              </button>
            </div>

            {/* Painel Profissional (Banner fictício do Instagram) */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 text-xs">
              <p className="font-semibold text-white">Painel profissional</p>
              <p className="text-gray-400">14 visualizações nos últimos 30 dias.</p>
            </div>

            {/* Destaques (Highlights) */}
            <div className="flex space-x-4 overflow-x-auto py-2 no-scrollbar border-b border-gray-800">
              <div 
                onClick={() => setShowNewPostModal(true)}
                className="flex flex-col items-center space-y-1 cursor-pointer min-w-[64px]"
              >
                <div className="w-14 h-14 rounded-full border border-gray-700 flex items-center justify-center bg-gray-900">
                  <PlusCircle size={24} className="text-gray-400" />
                </div>
                <span className="text-xs text-gray-400">Novo</span>
              </div>

              <div className="flex flex-col items-center space-y-1 min-w-[64px]">
                <div className="w-14 h-14 rounded-full border-2 border-red-600 p-0.5">
                  <img 
                    src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=200&auto=format&fit=crop&q=80" 
                    className="w-full h-full rounded-full object-cover" 
                    alt="AWP"
                  />
                </div>
                <span className="text-xs text-gray-300 font-medium">AWP</span>
              </div>
            </div>

            {/* Abas de Navegação do Feed (Grade / Vídeos / Marcados) */}
            <div className="flex justify-around border-b border-gray-800 pt-1">
              <button
                onClick={() => setProfileSubTab('grid')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'grid' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => setProfileSubTab('reels')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'reels' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <Film size={20} />
              </button>
              <button
                onClick={() => setProfileSubTab('tagged')}
                className={`flex justify-center items-center py-2 flex-1 border-b-2 ${
                  profileSubTab === 'tagged' ? 'border-white text-white' : 'border-transparent text-gray-500'
                }`}
              >
                <User size={20} />
              </button>
            </div>

            {/* FEED DE POSTS (GRADE DE FOTOS E VÍDEOS) */}
            {profileSubTab === 'grid' && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {posts.map((post) => (
                  <div key={post.id} className="relative aspect-square group bg-gray-900 overflow-hidden cursor-pointer">
                    {post.type === 'video' ? (
                      <video 
                        src={post.url} 
                        poster={post.thumbnail}
                        className="w-full h-full object-cover"
                        muted 
                        loop
                      />
                    ) : (
                      <img 
                        src={post.url} 
                        alt="Post Feed" 
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Indicadores de tipo no topo da imagem */}
                    {post.type === 'video' && (
                      <div className="absolute top-1.5 right-1.5 bg-black/60 p-1 rounded-full">
                        <Play size={12} className="text-white fill-white" />
                      </div>
                    )}

                    {/* Ícone de Pinned */}
                    {post.pinned && (
                      <div className="absolute top-1.5 left-1.5 bg-red-600 p-1 rounded-full text-white shadow">
                        <Zap size={10} />
                      </div>
                    )}

                    {/* Hover Effect */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-4 text-white font-bold text-xs">
                      <span>❤️ {post.likes}</span>
                      <span>💬 {post.comments}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'reels' && (
              <div className="grid grid-cols-3 gap-1 pt-1">
                {posts.filter(p => p.type === 'video').map((post) => (
                  <div key={post.id} className="relative aspect-[9/16] bg-gray-900 overflow-hidden">
                    <video src={post.url} className="w-full h-full object-cover" controls />
                  </div>
                ))}
              </div>
            )}

            {profileSubTab === 'tagged' && (
              <div className="py-12 text-center text-gray-500 text-sm">
                Nenhum vídeo ou foto marcada por outros usuários ainda.
              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* ABA DO COACH IA (ANÁLISE BASEADA NAS 4 IMAGENS DO CODM)  */}
        {/* ========================================================= */}
        {activeTab === 'coach' && (
          <div className="space-y-6">
            
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                <Zap className="text-red-500" size={20} />
                <span>Coach IA - Análise Tática COD Mobile</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Para obter o veredito exato da partida, envie os **4 prints específicos** da tela de estatísticas detalhadas pós-jogo.
              </p>
            </div>

            {/* GRID DE UPLOAD DOS 4 PRINTS OBRIGATÓRIOS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* PRINT 1: RELATÓRIO DETALHADO (IMPACTO) */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">1. Vitória / Impacto / KDA</span>
                    {coachScreenshots.impacto && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Placard final, Score, KDA (B/M), Precisão e Headshots.</p>
                </div>

                {coachScreenshots.impacto ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.impacto} alt="Print Impacto" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, impacto: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 1</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('impacto', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 2: ARMAMENTO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">2. Armamento & Loadout</span>
                    {coachScreenshots.armamento && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Armas principais, secundárias, Vantagens e Séries de Pontuação.</p>
                </div>

                {coachScreenshots.armamento ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.armamento} alt="Print Armamento" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, armamento: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 2</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('armamento', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 3: OBJETO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">3. Pontuação de Objeto</span>
                    {coachScreenshots.objeto && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com Letal/Tático, Habilidade de Operador e Pontuação de Objeto.</p>
                </div>

                {coachScreenshots.objeto ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.objeto} alt="Print Objeto" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, objeto: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 3</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('objeto', e)} />
                  </label>
                )}
              </div>

              {/* PRINT 4: DUELO */}
              <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">4. Matriz de Duelos</span>
                    {coachScreenshots.duelo && <Check size={16} className="text-green-500" />}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-3">Print com confronto direto (X - Y) contra cada jogador do time rival.</p>
                </div>

                {coachScreenshots.duelo ? (
                  <div className="relative h-28 bg-gray-900 rounded overflow-hidden border border-gray-800">
                    <img src={coachScreenshots.duelo} alt="Print Duelo" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setCoachScreenshots(p => ({ ...p, duelo: null }))}
                      className="absolute top-1 right-1 bg-black/80 p-1 rounded-full text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-800 hover:border-red-600 h-28 rounded flex flex-col items-center justify-center cursor-pointer transition">
                    <Upload size={20} className="text-gray-500 mb-1" />
                    <span className="text-xs text-gray-400">Anexar Print 4</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleScreenshotUpload('duelo', e)} />
                  </label>
                )}
              </div>

            </div>

            {/* Botões de Ação para Análise */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={runCoachAnalysis}
                disabled={analyzing}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center space-x-2 transition shadow-lg shadow-red-900/30"
              >
                {analyzing ? (
                  <span>Analisando 4 prints com IA...</span>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Gerar Veredito Tático da Partida</span>
                  </>
                )}
              </button>

              <button
                onClick={loadExampleScreenshots}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 font-medium px-4 py-3 rounded-lg text-xs transition"
              >
                Preencher com Prints de Exemplo
              </button>
            </div>

            {/* VEREDITO DA IA */}
            {verdict && (
              <div className="bg-gray-950 border-2 border-red-600/50 rounded-xl p-5 space-y-5 animate-fade-in">
                
                {/* Cabeçalho do Veredito */}
                <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                  <div>
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Resultado da Análise IA</span>
                    <h3 className="text-xl font-black text-white mt-0.5">{verdict.matchResult}</h3>
                    <p className="text-xs text-gray-400 mt-1">Função identificada: <span className="text-red-400 font-semibold">{verdict.playerRole}</span></p>
                  </div>
                  <div className="bg-red-600/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-center">
                    <div className="text-xs font-semibold">RANKING</div>
                    <div className="text-2xl font-black">{verdict.overallRating}</div>
                  </div>
                </div>

                {/* Grid de Estatísticas Extraídas */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">K/D/A Final</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.kda}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Pontuação Total</div>
                    <div className="text-sm font-bold text-yellow-400">{verdict.extractedStats.score}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Precisão de Tiro</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.accuracy}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Tiros na Cabeça</div>
                    <div className="text-sm font-bold text-white">{verdict.extractedStats.headshots}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Pts de Objeto</div>
                    <div className="text-sm font-bold text-green-400">{verdict.extractedStats.objScore}</div>
                  </div>
                  <div className="bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                    <div className="text-[10px] text-gray-400">Tempo na Zona</div>
                    <div className="text-sm font-bold text-gray-300">{verdict.extractedStats.objTime}</div>
                  </div>
                </div>

                {/* Análise de Loadout */}
                <div className="bg-gray-900/80 p-3.5 rounded-lg border border-gray-800 space-y-1">
                  <h4 className="text-xs font-bold text-gray-200 uppercase flex items-center space-x-1">
                    <Shield size={14} className="text-red-500" />
                    <span>Avaliação de Armamento ({verdict.loadoutAnalysis.weapon})</span>
                  </h4>
                  <p className="text-xs text-gray-300">{verdict.loadoutAnalysis.verdictText}</p>
                </div>

                {/* Análise de Duelos x Inimigos */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-200 uppercase">Matriz de Confronte Direto (Duelos)</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {verdict.duelsAnalysis.map((duel, i) => (
                      <div key={i} className="flex justify-between items-center bg-gray-900 p-2 rounded border border-gray-800 text-xs">
                        <span className="text-gray-300 font-medium">{duel.enemy}</span>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">{duel.score}</span>
                          <span className="bg-green-950 text-green-400 text-[10px] px-1.5 py-0.5 rounded border border-green-800">{duel.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recomendações e Dicas do Coach */}
                <div className="space-y-2 pt-2 border-t border-gray-800">
                  <h4 className="text-xs font-bold text-red-400 uppercase flex items-center space-x-1">
                    <Award size={14} />
                    <span>Recomendações Práticas do Coach</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {verdict.coachRecommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-gray-300 flex items-start space-x-2">
                        <span className="text-red-500 font-bold">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

              </div>
            )}

          </div>
        )}

      </main>

      {/* MODAL PARA PUBLICAR NOVO VÍDEO/FOTO NO PERFIL */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-950 border border-gray-800 w-full max-w-md rounded-xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <h3 className="font-bold text-white text-base">Nova Publicação no Feed</h3>
              <button onClick={() => setShowNewPostModal(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddPost} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Tipo de Mídia</label>
                <div className="flex space-x-3">
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="postType" 
                      value="image" 
                      checked={newPostType === 'image'} 
                      onChange={() => setNewPostType('image')} 
                    />
                    <span>Imagem</span>
                  </label>
                  <label className="flex items-center space-x-1 cursor-pointer">
                    <input 
                      type="radio" 
                      name="postType" 
                      value="video" 
                      checked={newPostType === 'video'} 
                      onChange={() => setNewPostType('video')} 
                    />
                    <span>Vídeo</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">URL da Mídia (Imagem ou Vídeo MP4)</label>
                <input 
                  type="text" 
                  required
                  placeholder="https://..."
                  value={newPostUrl}
                  onChange={(e) => setNewPostUrl(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white text-xs focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Legenda</label>
                <textarea 
                  rows={2}
                  placeholder="Escreva uma legenda..."
                  value={newPostCaption}
                  onChange={(e) => setNewPostCaption(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded p-2 text-white text-xs focus:outline-none focus:border-red-600"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowNewPostModal(false)}
                  className="flex-1 bg-gray-900 hover:bg-gray-800 text-gray-300 py-2 rounded text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded text-xs"
                >
                  Publicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}