import React, { useState } from 'react';
import { Send, Image, Trophy } from 'lucide-react';

export default function Home() {
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([
    { id: 1, author: 'VikingAdmin', text: 'Bem-vindos ao novo VIKING eSports Hub!', time: '10 min atrás' }
  ]);

  const handleCreatePost = (e) => {
    e.preventDefault();
    if (!postText.trim()) return;
    
    const newPost = {
      id: Date.now(),
      author: 'Você',
      text: postText,
      time: 'Agora mesmo'
    };
    
    setPosts([newPost, ...posts]);
    setPostText('');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Box de Publicação */}
      <div className="bg-viking-card p-4 rounded-xl border border-gray-800 shadow-lg">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <textarea
            value={postText}
            onChange={(e) => setPostText(e.target.value)}
            placeholder="O que está acontecendo na arena?"
            className="w-full bg-viking-dark border border-gray-700 rounded-lg p-3 text-white focus:outline-none focus:border-viking-gold resize-none h-24"
          />
          <div className="flex justify-between items-center">
            <button type="button" className="flex items-center space-x-2 text-gray-400 hover:text-viking-gold">
              <Image className="w-5 h-5" />
              <span className="text-sm">Anexar Mídia</span>
            </button>
            <button
              type="submit"
              className="bg-viking-gold hover:bg-yellow-500 text-black font-bold px-5 py-2 rounded-lg flex items-center space-x-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Publicar</span>
            </button>
          </div>
        </form>
      </div>

      {/* Feed de Publicações */}
      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-viking-card p-5 rounded-xl border border-gray-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-viking-gold">{post.author}</span>
              <span className="text-xs text-gray-500">{post.time}</span>
            </div>
            <p className="text-gray-200">{post.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}