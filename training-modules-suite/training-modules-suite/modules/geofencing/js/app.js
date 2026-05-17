
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];

$$('[data-scroll]').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = $(btn.dataset.scroll);
    if (target) target.scrollIntoView({behavior:'smooth', block:'start'});
  });
});

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('show');
  });
}, {threshold: 0.15});
$$('.reveal').forEach(el => revealObserver.observe(el));

const tabs = $$('.tab');
const panels = $$('.scenario');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(t => t.classList.toggle('active', t === tab));
  panels.forEach(panel => panel.classList.toggle('active', panel.id === tab.dataset.scenario));
}));

const quizQuestions = [
  {
    q: 'A request from outside the approved geography goes directly to the site with no trusted exception path. What is the expected decision?',
    options: ['Allow because the destination is in PK', 'Deny because visible source geography fails policy', 'Allow if ASN is known', 'Allow after repeated retries'],
    answer: 1
  },
  {
    q: 'In the bypass-risk example, why can the site be fooled?',
    options: ['Because the DNS record changes', 'Because the final visible source appears PK even if the real operator is elsewhere', 'Because the browser is trusted automatically', 'Because the request bypasses HTTP'],
    answer: 1
  },
  {
    q: 'Which approved lane represents a stronger routed connectivity path?',
    options: ['Random public proxy', 'MOFA + VPN', 'Unknown VPN exit', 'Untrusted relay'],
    answer: 1
  },
  {
    q: 'Which logging field is especially useful for interpreting repeated denied access attempts?',
    options: ['Only favicon hash', 'Only screen resolution', 'Source IP and deny reason', 'Only CSS path'],
    answer: 2
  }
];

const quizBox = $('#quizBox');
if (quizBox) {
  quizBox.innerHTML = quizQuestions.map((q, i) => `
    <div class="quiz-item">
      <h4>Q${i+1}. ${q.q}</h4>
      <div class="quiz-options">
        ${q.options.map((opt, j) => `
          <label><input type="radio" name="q${i}" value="${j}"> <span>${opt}</span></label>
        `).join('')}
      </div>
    </div>
  `).join('');
}
$('#checkQuiz')?.addEventListener('click', () => {
  let score = 0;
  quizQuestions.forEach((q, i) => {
    const picked = document.querySelector(`input[name="q${i}"]:checked`);
    if (picked && Number(picked.value) === q.answer) score += 1;
  });
  const message = score === quizQuestions.length
    ? 'Excellent. You understand the access-control logic clearly.'
    : score >= 2 ? 'Good attempt. Revisit the policy and bypass-risk diagrams for full mastery.'
    : 'Review the three diagrams and the decision-engine cards, then retry.';
  $('#scoreText').textContent = `Score: ${score}/${quizQuestions.length}. ${message}`;
});
