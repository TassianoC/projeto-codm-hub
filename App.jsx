import React, { useState, useRef, useEffect } from 'react';
import { 
  MoreHorizontal, Trash2, Edit3, X, Send, 
  CheckCircle2, RotateCcw, Image, Smile, Paperclip 
} from 'lucide-react';

export default function App() {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('idle'); // 'idle' | 'posting' | 'success'
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [toast, setToast] = useState(null);

  const textareaRef = useRef(null);
  const abortControllerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const maxLength = 280;

  // Ajuste automático de altura do textarea conforme digita
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // Handler de envio rápido com progresso
  const handlePost = () => {
    if (!content.trim() || content.length > maxLength) return;

    setStatus('posting');
    setProgress(0);
    abortControllerRef.current = new AbortController();

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 10));
    }, 100);

    setTimeout(() => {
      clearInterval(progressIntervalRef.current);
      setProgress(100);

      setTimeout(() => {
        setStatus('success');
        showToastNotification('Publicado com sucesso!');
        setTimeout(() => {
          setContent('');
          setStatus('idle');
          setProgress(0);
        }, 1000);
      }, 300);
    }, 1200);
  };

  // Cancelar a postagem em andamento
  const handleCancel = () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    clearInterval(progressIntervalRef.current);
    setStatus('idle');
    setProgress(0);
    showToastNotification('Envio cancelado.', 'info');
  };

  // Excluir post com opção de desfazer (Undo)
  const handleDelete = () => {
    setShowMenu(false);
    const savedContent = content;
    setContent('');
    showToastNotification('Post excluído.', 'undo', () => setContent(savedContent));
  };

  const showToastNotification = (msg, type = 'success', undoCallback = null) => {
    setToast({ msg, type, undoCallback });
    setTimeout(() => setToast(null), 4000);
  };

  // Cálculo de progresso do limite de caracteres
  const charPercentage = Math.min((content.length / maxLength) * 100, 100);
  const strokeDashoffset = 100 - charPercentage;

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative font-sans">
      
      {/* Card Principal de Criar Post */}
      <div className="w-full max-w-lg bg-slate-800/80 backdrop-blur-md rounded-2xl p-5 border border-slate-700/80 shadow-2xl transition-all space-y-4">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-md">
              U
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Criar Publicação</h4>
              <p className="text-xs text-slate-400">Visível para todos</p>
            </div>
          </div>

          {/* Menu Minimizado de Edição/Exclusão */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-full transition-all active:scale-95"
            >
              <MoreHorizontal size={20} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-10 w-44 bg-slate-800 rounded-xl border border-slate-700 shadow-xl py-1.5 z-20">
                <button
                  onClick={() => { setShowMenu(false); textareaRef.current?.focus(); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-slate-300 hover:bg-slate-700 flex items-center gap-2.5 transition-colors"
                >
                  <Edit3 size={15} className="text-slate-400" /> Editar Rascunho
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <button
                  onClick={handleDelete}
                  className="w-full px-3.5 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors"
                >
                  <Trash2 size={15} className="text-rose-400" /> Excluir Post
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Campo de Texto */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="No que você está pensando agora?"
          disabled={status === 'posting'}
          rows={3}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none transition-all disabled:opacity-60 min-h-[80px]"
        />

        {/* Barra de Progresso de Envio */}
        {status === 'posting' && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-indigo-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                Publicando...
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-150 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Rodapé e Botões de Ação */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-700/60">
          
          {/* Mídias */}
          <div className="flex items-center gap-1 text-slate-400">
            <button className="p-2 hover:bg-slate-700/60 hover:text-indigo-400 rounded-lg transition"><Image size={18} /></button>
            <button className="p-2 hover:bg-slate-700/60 hover:text-indigo-400 rounded-lg transition"><Smile size={18} /></button>
            <button className="p-2 hover:bg-slate-700/60 hover:text-indigo-400 rounded-lg transition"><Paperclip size={18} /></button>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicador Circular de Caracteres */}
            {content.length > 0 && status !== 'posting' && (
              <div className="relative w-6 h-6 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-700"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={content.length > maxLength ? "text-rose-500" : "text-indigo-500"}
                    strokeDasharray="100, 100"
                    strokeDashoffset={strokeDashoffset}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
              </div>
            )}

            {/* Alternância de Botões: Postar / Cancelar */}
            {status === 'posting' ? (
              <button
                onClick={handleCancel}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl transition active:scale-95"
              >
                <X size={15} /> Cancelar
              </button>
            ) : status === 'success' ? (
              <button
                disabled
                className="flex items-center gap-1.5 px-5 py-2 bg-emerald-500 text-white text-xs font-semibold rounded-xl"
              >
                <CheckCircle2 size={15} /> Postado!
              </button>
            ) : (
              <button
                onClick={handlePost}
                disabled={!content.trim() || content.length > maxLength}
                className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-indigo-500/20 active:scale-95"
              >
                <Send size={14} /> Postar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notificação Toast Flutuante */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 border border-slate-700 text-white text-xs px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
          <span>{toast.msg}</span>
          {toast.undoCallback && (
            <button
              onClick={() => { toast.undoCallback(); setToast(null); }}
              className="text-indigo-400 font-semibold hover:text-indigo-300 flex items-center gap-1 underline underline-offset-2"
            >
              <RotateCcw size={12} /> Desfazer
            </button>
          )}
        </div>
      )}
    </div>
  );
}