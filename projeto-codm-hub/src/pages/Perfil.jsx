import React, { useState } from 'react';
import { User, Camera, Upload, Trash2, Award, ShieldCheck, Flame } from 'lucide-react';

export default function Perfil() {
  const [profileData] = useState({
    name: 'Tassiano',
    tag: '#VIKING-123',
    role: 'Líder do Clan',
    rank: 'Lendário',
    kd: '2.45'
  });

  const [gallery, setGallery] = useState([
    { id: 1, title: 'Clutch no S&D 1v4', url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80' },
    { id: 2, title: 'Vitória BR Squad', url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80' }
  ]);

  const [uploadTitle, setUploadTitle] = useState('');

  const handleSimulatedUpload = (e) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    const newItem = {
      id: Date.now(),
      title: uploadTitle,
      url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=600&q=80'
    };

    setGallery([newItem, ...gallery]);
    setUploadTitle('');
  };

  const handleDelete = (id) => {
    setGallery(gallery.filter((item) => item.id !== id));
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      {/* Banner & Dados do Jogador */}
      <div className="bg-viking-card rounded-2xl border border-gray-800 p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-viking-dark border-2 border-viking-gold flex items-center justify-center overflow-hidden shadow-lg">
              <User className="w-12 h-12 text-viking-gold" />
            </div>
            <button className="absolute bottom-0 right-0 p-1.5 bg-viking-gold text-black rounded-full shadow hover:bg-yellow-400 transition">
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center sm:text-left space-y-1">
            <div className="flex items-center justify-center sm:justify-start space-x-2">
              <h1 className="text-2xl font-extrabold text-white">{profileData.name}</h1>
              <span className="text-sm font-semibold text-viking-gold bg-viking-gold/10 px-2.5 py-0.5 rounded border border-viking-gold/30">
                {profileData.tag}
              </span>
            </div>
            <p className="text-sm text-gray-400 flex items-center justify-center sm:justify-start space-x-1">
              <ShieldCheck className="w-4 h-4 text-viking-gold" />
              <span>{profileData.role}</span>
            </p>
          </div>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <div className="bg-viking-dark/60 p-3 rounded-xl border border-gray-800 text-center">
            <p className="text-xs text-gray-500">Elo Atual</p>
            <p className="text-base font-bold text-viking-gold flex items-center justify-center space-x-1 mt-1">
              <Award className="w-4 h-4" />
              <span>{profileData.rank}</span>
            </p>
          </div>
          <div className="bg-viking-dark/60 p-3 rounded-xl border border-gray-800 text-center">
            <p className="text-xs text-gray-500">K/D Ratio</p>
            <p className="text-base font-bold text-white flex items-center justify-center space-x-1 mt-1">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{profileData.kd}</span>
            </p>
          </div>
          <div className="bg-viking-dark/60 p-3 rounded-xl border border-gray-800 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-500">Mídias Salvas</p>
            <p className="text-base font-bold text-white mt-1">{gallery.length}</p>
          </div>
        </div>
      </div>

      {/* Formulário de Envio de Mídia */}
      <div className="bg-viking-card p-6 rounded-2xl border border-gray-800 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Upload className="w-5 h-5 text-viking-gold" />
          <span>Enviar Destaque ou Jogada</span>
        </h2>

        <form onSubmit={handleSimulatedUpload} id="media-upload-form" className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Título da jogada (ex: Ace no Search & Destroy)"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            className="flex-1 bg-viking-dark border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-viking-gold"
          />
          <button
            type="submit"
            className="bg-viking-gold hover:bg-yellow-500 text-black font-bold px-6 py-2 rounded-lg text-sm transition flex items-center justify-center space-x-2"
          >
            <span>Fazer Upload</span>
          </button>
        </form>
      </div>

      {/* Galeria de Fotos e Destaques */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-viking-gold">Galeria de Conquistas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {gallery.map((item) => (
            <div key={item.id} className="bg-viking-card border border-gray-800 rounded-xl overflow-hidden group shadow-lg">
              <div className="h-44 overflow-hidden relative">
                <img 
                  src={item.url} 
                  alt={item.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 p-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition"
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-gray-200">{item.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}