const playBtn = document.getElementById('playBtn');
const howBtn = document.getElementById('howBtn');
const howToPlay = document.getElementById('howToPlay');

if (playBtn) {
    playBtn.addEventListener('click', () => {
        window.location.href = 'spel.html';
    });
}

if (howBtn && howToPlay) {
    howBtn.addEventListener('click', () => {
        const isHidden = howToPlay.classList.toggle('hidden');
        howBtn.textContent = isHidden ? 'How to play' : 'Hide instructions';
    });
}