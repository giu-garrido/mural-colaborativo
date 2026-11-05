// ==========================================================
//  Mural Colaborativo - frontend
//  Eventos seguem o contrato: notes:init, note:create,
//  note:update, note:move, note:delete
// ==========================================================

const mural = document.getElementById('mural');
const CORES = ['#ffb3d9', '#d9b3ff', '#b3e0ff', '#fff3a3', '#b8f5d0'];
let corSelecionada = CORES[0];
let zTopo = 1;

// id -> { dados: {id, text, x, y, color}, el: <div> }
const notas = new Map();

// ----------------------------------------------------------
//  Comunicação (PASSO 1: "servidor de mentirinha")
//  Por enquanto tudo que enviamos volta direto pra gente.
//  No passo 2 isso vira socket.emit / socket.on.
// ----------------------------------------------------------
function enviar(evento, dados) {
  receber(evento, dados);
}

function receber(evento, dados) {
  switch (evento) {
    case 'notes:init':  dados.forEach(desenharNota); break;
    case 'note:create': desenharNota(dados);         break;
    case 'note:update': atualizarNota(dados);        break;
    case 'note:move':   moverNota(dados);            break;
    case 'note:delete': apagarNota(dados);           break;
  }
}

// ----------------------------------------------------------
//  Renderização
// ----------------------------------------------------------
function desenharNota(dados) {
  if (notas.has(dados.id)) return;

  const el = document.createElement('div');
  el.className = 'nota';
  el.innerHTML = `
    <div class="nota-barra">
      <span class="nota-titulo">♡ recadinho.txt</span>
      <button class="nota-cor" title="trocar cor">✿</button>
      <button class="nota-fechar" title="apagar">✕</button>
    </div>
    <textarea class="nota-texto" placeholder="escreve aqui..."></textarea>
  `;

  const texto = el.querySelector('.nota-texto');
  texto.value = dados.text; // value (e não innerHTML) evita injeção de HTML

  el.style.left = dados.x + 'px';
  el.style.top = dados.y + 'px';
  el.style.setProperty('--cor', dados.color);
  el.style.zIndex = zTopo++;

  notas.set(dados.id, { dados: { ...dados }, el });
  mural.appendChild(el);
  ligarInteracoes(dados.id, el);
}

function atualizarNota({ id, text, color }) {
  const nota = notas.get(id);
  if (!nota) return;
  nota.dados.text = text;
  nota.dados.color = color;

  const texto = nota.el.querySelector('.nota-texto');
  // não sobrescreve enquanto a própria pessoa está digitando
  if (document.activeElement !== texto) texto.value = text;
  nota.el.style.setProperty('--cor', color);
}

function moverNota({ id, x, y }) {
  const nota = notas.get(id);
  if (!nota) return;
  nota.dados.x = x;
  nota.dados.y = y;
  nota.el.style.left = x + 'px';
  nota.el.style.top = y + 'px';
}

function apagarNota({ id }) {
  const nota = notas.get(id);
  if (!nota) return;
  nota.el.remove();
  notas.delete(id);
}

// ----------------------------------------------------------
//  Interações de cada post-it
// ----------------------------------------------------------
function ligarInteracoes(id, el) {
  const barra = el.querySelector('.nota-barra');
  const texto = el.querySelector('.nota-texto');

  // traz pra frente ao clicar
  el.addEventListener('pointerdown', () => { el.style.zIndex = zTopo++; });

  // editar texto
  texto.addEventListener('input', () => {
    const { color } = notas.get(id).dados;
    enviar('note:update', { id, text: texto.value, color });
  });

  // trocar cor (vai pra próxima da lista)
  el.querySelector('.nota-cor').addEventListener('click', () => {
    const { text, color } = notas.get(id).dados;
    const proxima = CORES[(CORES.indexOf(color) + 1) % CORES.length];
    enviar('note:update', { id, text, color: proxima });
  });

  // apagar
  el.querySelector('.nota-fechar').addEventListener('click', () => {
    enviar('note:delete', { id });
  });

  // arrastar pela barra de título
  barra.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    barra.setPointerCapture(e.pointerId);
    el.classList.add('arrastando');

    const { x, y } = notas.get(id).dados;
    const inicio = { mouseX: e.clientX, mouseY: e.clientY, x, y };

    const mover = (ev) => {
      const novoX = limitar(inicio.x + ev.clientX - inicio.mouseX, 0, mural.clientWidth - el.offsetWidth);
      const novoY = limitar(inicio.y + ev.clientY - inicio.mouseY, 0, mural.clientHeight - el.offsetHeight);
      enviar('note:move', { id, x: Math.round(novoX), y: Math.round(novoY) });
    };

    const soltar = () => {
      el.classList.remove('arrastando');
      barra.removeEventListener('pointermove', mover);
      barra.removeEventListener('pointerup', soltar);
      barra.removeEventListener('pointercancel', soltar);
    };

    barra.addEventListener('pointermove', mover);
    barra.addEventListener('pointerup', soltar);
    barra.addEventListener('pointercancel', soltar);
  });
}

// ----------------------------------------------------------
//  Criar post-its
// ----------------------------------------------------------
function criarNota(x, y) {
  const id = gerarId();
  enviar('note:create', { id, text: '', x, y, color: corSelecionada });
  notas.get(id)?.el.querySelector('.nota-texto').focus();
}

document.getElementById('btn-novo').addEventListener('click', () => {
  const x = Math.random() * Math.max(0, mural.clientWidth - 220);
  const y = Math.random() * Math.max(0, mural.clientHeight - 180);
  criarNota(Math.round(x), Math.round(y));
});

// duplo clique num espaço vazio do mural cria ali mesmo
mural.addEventListener('dblclick', (e) => {
  if (e.target !== mural) return;
  const r = mural.getBoundingClientRect();
  criarNota(Math.round(e.clientX - r.left - 105), Math.round(e.clientY - r.top - 20));
});

// paleta de cores
document.getElementById('paleta').addEventListener('click', (e) => {
  const botao = e.target.closest('button');
  if (!botao) return;
  document.querySelectorAll('#paleta button').forEach(b => b.classList.remove('ativa'));
  botao.classList.add('ativa');
  corSelecionada = botao.dataset.cor;
});

// ----------------------------------------------------------
//  Utilidades
// ----------------------------------------------------------
function limitar(valor, min, max) {
  return Math.min(Math.max(valor, min), Math.max(min, max));
}

function gerarId() {
  // randomUUID só existe em contexto seguro (https/localhost)
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ----------------------------------------------------------
//  Toque anos 2000: brilhinhos seguindo o mouse ✦
// ----------------------------------------------------------
let ultimoBrilho = 0;
document.addEventListener('pointermove', (e) => {
  const agora = Date.now();
  if (agora - ultimoBrilho < 40) return;
  ultimoBrilho = agora;

  const b = document.createElement('span');
  b.className = 'brilho';
  b.textContent = ['✦', '✧', '♡', '⋆'][Math.floor(Math.random() * 4)];
  b.style.left = e.clientX + 'px';
  b.style.top = e.clientY + 'px';
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 800);
});

// ----------------------------------------------------------
//  Início (simula o servidor mandando notes:init)
// ----------------------------------------------------------
receber('notes:init', [
  { id: 'boas-vindas', text: 'oiii! arrasta, edita e apaga à vontade ♡', x: 40, y: 40, color: '#ffb3d9' },
]);