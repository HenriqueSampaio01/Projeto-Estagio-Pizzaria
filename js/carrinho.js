// ════════════════════════════════
//  CARRINHO — localStorage
// ════════════════════════════════
function getCarrinho() {
  return JSON.parse(localStorage.getItem('bs_carrinho') || '[]')
}
function salvarCarrinho(carrinho) {
  localStorage.setItem('bs_carrinho', JSON.stringify(carrinho))
}

// ── Toast ──
function showToast(msg, tipo = 'success') {
  const t    = document.getElementById('toast')
  const icon = document.getElementById('toastIcon')
  document.getElementById('toastMsg').textContent = msg
  t.className = 'toast ' + tipo
  icon.innerHTML = tipo === 'success'
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 3000)
}

// ── Nome do cliente na header ──
const nome = sessionStorage.getItem('cliente_nome')
if (nome) {
  document.getElementById('dashUser').textContent = `Olá, ${nome}`
}

// ════════════════════════════════
//  RENDERIZAR CARRINHO
// ════════════════════════════════
function renderCarrinho() {
  const carrinho = getCarrinho()
  const conteudo = document.getElementById('carrinhoConteudo')
  const resumo   = document.getElementById('resumoWrap')

  if (!carrinho.length) {
    conteudo.innerHTML = `
      <div class="empty-cart">
        <div style="font-size:48px;margin-bottom:12px;">🛒</div>
        <p>Seu carrinho está vazio.</p>
        <a href="index.html" class="btn-voltar">Ver cardápio</a>
      </div>`
    resumo.style.display = 'none'
    return
  }

  conteudo.innerHTML = carrinho.map((item, idx) => `
    <div class="carrinho-item">
      <div class="item-header">
        <div>
          <div class="item-nome">${item.nome}</div>
          <div class="item-categoria">R$ ${Number(item.preco).toFixed(2).replace('.', ',')} cada</div>
        </div>
        <div class="item-acoes">
          <button class="btn-icon" title="Editar" onclick="abrirEditar(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Remover" onclick="removerItem(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
      ${item.obs ? `<div class="item-obs">📝 ${item.obs}</div>` : ''}
      <div class="item-footer">
        <div class="item-qty-wrap">
          <button class="qty-btn" onclick="alterarQty(${idx}, -1)">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="alterarQty(${idx}, +1)">+</button>
        </div>
        <div class="item-subtotal">R$ ${(item.preco * item.qty).toFixed(2).replace('.', ',')}</div>
      </div>
    </div>
  `).join('')

  const total = carrinho.reduce((s, i) => s + i.preco * i.qty, 0)
  resumo.style.display = 'block'
  document.getElementById('resumoSubtotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`
  document.getElementById('resumoTotal').textContent    = `R$ ${total.toFixed(2).replace('.', ',')}`
}

// ════════════════════════════════
//  AÇÕES
// ════════════════════════════════

// Alterar quantidade direto na lista
window.alterarQty = (idx, delta) => {
  const carrinho = getCarrinho()
  carrinho[idx].qty += delta
  if (carrinho[idx].qty <= 0) {
    carrinho.splice(idx, 1)
    showToast('Item removido.')
  }
  salvarCarrinho(carrinho)
  renderCarrinho()
}

// Remover item
window.removerItem = (idx) => {
  const carrinho = getCarrinho()
  carrinho.splice(idx, 1)
  salvarCarrinho(carrinho)
  showToast('Item removido.')
  renderCarrinho()
}

// Limpar carrinho
document.getElementById('btnLimpar').addEventListener('click', () => {
  localStorage.removeItem('bs_carrinho')
  showToast('Carrinho limpo.')
  renderCarrinho()
})

// Finalizar pedido (placeholder)
document.getElementById('btnFinalizar').addEventListener('click', () => {
  showToast('Funcionalidade em desenvolvimento.')
  // TODO: redirecionar para tela de pagamento/endereço
})

// ════════════════════════════════
//  MODAL EDITAR ITEM
// ════════════════════════════════
const modalEditar = document.getElementById('modalEditar')
let editQty = 1

window.abrirEditar = (idx) => {
  const item = getCarrinho()[idx]
  editQty = item.qty
  document.getElementById('editIndex').value       = idx
  document.getElementById('editNome').textContent  = item.nome
  document.getElementById('editPreco').textContent = `R$ ${Number(item.preco).toFixed(2).replace('.', ',')}`
  document.getElementById('editObs').value         = item.obs ?? ''
  document.getElementById('editVal').textContent   = editQty
  modalEditar.classList.add('open')
}

document.getElementById('editMinus').addEventListener('click', () => {
  if (editQty > 1) { editQty--; document.getElementById('editVal').textContent = editQty }
})
document.getElementById('editPlus').addEventListener('click', () => {
  editQty++; document.getElementById('editVal').textContent = editQty
})

document.getElementById('fecharEditar').addEventListener('click',  () => modalEditar.classList.remove('open'))
document.getElementById('cancelarEditar').addEventListener('click', () => modalEditar.classList.remove('open'))

document.getElementById('salvarEditar').addEventListener('click', () => {
  const idx      = parseInt(document.getElementById('editIndex').value)
  const obs      = document.getElementById('editObs').value.trim()
  const carrinho = getCarrinho()
  carrinho[idx].qty = editQty
  carrinho[idx].obs = obs
  salvarCarrinho(carrinho)
  modalEditar.classList.remove('open')
  showToast('Item atualizado!')
  renderCarrinho()
})

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open') })
})

// ════════════════════════════════
//  INIT
// ════════════════════════════════
renderCarrinho()