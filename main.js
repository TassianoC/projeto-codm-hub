// Ações de Interatividade e Navegação

// Abertura e Fechamento do Modal
function openModal(title, bodyText) {
    const modal = document.getElementById('item-modal');
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-body').innerText = bodyText;
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('item-modal');
    modal.style.display = 'none';
}

// Fechar Modal ao Clicar no Fundo
window.onclick = function(event) {
    const modal = document.getElementById('item-modal');
    if (event.target === modal) {
        closeModal();
    }
}

// Rolar com efeito suave
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({ behavior: 'smooth' });
    }
}

// Troca de Abas dos 3 Módulos
function switchTab(tabName) {
    const tabs = ['admin', 'driver', 'parent'];
    
    // Oculta todas as abas e desativa os botões
    tabs.forEach(tab => {
        document.getElementById(`tab-${tab}`).classList.remove('active');
    });

    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));

    // Ativa a aba e o botão correspondente
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // Atualiza o botão ativo
    if (tabName === 'admin') buttons[0].classList.add('active');
    if (tabName === 'driver') buttons[1].classList.add('active');
    if (tabName === 'parent') buttons[2].classList.add('active');
}