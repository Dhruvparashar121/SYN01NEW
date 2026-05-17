
const chooser = document.getElementById('chooser');
const viewer = document.getElementById('viewerSection');
const frame = document.getElementById('moduleFrame');
const titleEl = document.getElementById('viewerTitle');
const openButtons = [...document.querySelectorAll('[data-module]')].filter(el => el.classList.contains('module-card') || el.classList.contains('switcher'));

function openModule(path, title){
  frame.src = path;
  titleEl.textContent = title;
  chooser.classList.add('hidden');
  viewer.classList.remove('hidden');
  document.title = `${title} | Training Modules`;
}

openButtons.forEach(btn => btn.addEventListener('click', () => openModule(btn.dataset.module, btn.dataset.title)));
document.getElementById('backBtn').addEventListener('click', () => {
  frame.src = 'about:blank';
  chooser.classList.remove('hidden');
  viewer.classList.add('hidden');
  document.title = 'Training Modules';
});
