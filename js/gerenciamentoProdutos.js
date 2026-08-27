import { supabase } from './supabase.js'

// ── Auth ──
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  window.location.href = 'loginAdm.html'
} else {
  const nome = session.user?.user_metadata?.nome || session.user?.email
  document.getElementById('dashUser').textContent = 'Olá, ' + nome
}

document.getElementById('btnLogout').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'loginAdm.html'
})

// ── Toast ──
function showToast(msg, tipo = 'success') {
  const t = document.getElementById('toast')
  const icon = document.getElementById('toastIcon')
  document.getElementById('toastMsg').textContent = msg
  t.className = 'toast ' + tipo
  icon.innerHTML = tipo === 'success'
    ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'
    : '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 3000)
}

// ── Alertas dos modais ──
function showAlertModal(idAlert, idText, msg) {
  document.getElementById(idText).textContent = msg
  document.getElementById(idAlert).classList.add('visible')
}
function hideAlertModal(idAlert) {
  document.getElementById(idAlert).classList.remove('visible')
}

// ── Abas ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'))
    btn.classList.add('active')
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active')
  })
})

// ════════════════════════════════
//  CATEGORIAS
// ════════════════════════════════
let todasCategorias = []

async function carregarCategorias() {
  const { data, error } = await supabase
    .from('categoria')
    .select('*')
    .order('nome')

  if (error) { showToast('Erro ao carregar categorias.', 'error'); return }
  todasCategorias = data || []
  renderCategorias(todasCategorias)
  preencherSelectCategorias()
}

function renderCategorias(lista) {
  const tbody = document.getElementById('bodyCategorias')
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="4">Nenhuma categoria encontrada.</td></tr>'
    return
  }
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td style="color:var(--text-muted);font-size:12px;">#${c.codigo ?? c.id}</td>
      <td>${c.nome}</td>
      <td><span class="badge ${c.ativo ? 'badge-ativo' : 'badge-inativo'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="actions">
          <button class="btn-icon" title="Editar" onclick="editarCategoria(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Inativar" onclick="confirmarExcluir('categoria','${c.id}','${c.nome}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

function preencherSelectCategorias() {
  const sel = document.getElementById('pCategoria')
  const atual = sel.value
  sel.innerHTML = '<option value="">Selecionar categoria…</option>' +
    todasCategorias.filter(c => c.ativo).map(c =>
      `<option value="${c.id}">${c.nome}</option>`
    ).join('')
  if (atual) sel.value = atual
}

document.getElementById('searchCategoria').addEventListener('input', e => {
  const q = e.target.value.toLowerCase()
  renderCategorias(todasCategorias.filter(c => c.nome.toLowerCase().includes(q)))
})

function abrirModalCategoria(modo = 'novo', dados = null) {
  hideAlertModal('alertCategoria')
  document.getElementById('cId').value = dados?.id ?? ''
  document.getElementById('cNome').value = dados?.nome ?? ''
  document.getElementById('cAtivo').value = dados?.ativo !== false ? 'true' : 'false'
  document.getElementById('modalCategoriaTitulo').innerHTML =
    modo === 'novo' ? 'Nova <span>Categoria</span>' : 'Editar <span>Categoria</span>'
  document.getElementById('modalCategoria').classList.add('open')
}

window.editarCategoria = (c) => abrirModalCategoria('editar', c)

document.getElementById('btnAddCategoria').addEventListener('click', () => abrirModalCategoria('novo'))
document.getElementById('fecharModalCategoria').addEventListener('click', () => document.getElementById('modalCategoria').classList.remove('open'))
document.getElementById('cancelarCategoria').addEventListener('click', () => document.getElementById('modalCategoria').classList.remove('open'))

document.getElementById('salvarCategoria').addEventListener('click', async () => {
  hideAlertModal('alertCategoria')
  const id   = document.getElementById('cId').value
  const nome = document.getElementById('cNome').value.trim()
  const ativo = document.getElementById('cAtivo').value === 'true'

  if (!nome) { showAlertModal('alertCategoria', 'alertCategoriaText', 'Informe o nome da categoria.'); return }

  const btn = document.getElementById('salvarCategoria')
  btn.classList.add('loading'); btn.textContent = 'Salvando…'

  // /categoria/add ou /categoria/edit
  const { error } = id
    ? await supabase.from('categoria').update({ nome, ativo }).eq('id', id)
    : await supabase.from('categoria').insert({ nome, ativo })

  btn.classList.remove('loading'); btn.textContent = 'Salvar categoria'

  if (error) { showAlertModal('alertCategoria', 'alertCategoriaText', error.message); return }

  document.getElementById('modalCategoria').classList.remove('open')
  showToast(id ? 'Categoria atualizada!' : 'Categoria cadastrada!')
  carregarCategorias()
})

// ════════════════════════════════
//  PRODUTOS
// ════════════════════════════════
let todosProdutos = []

async function carregarProdutos() {
  const { data, error } = await supabase
    .from('produto')
    .select('*, categoria(nome)')
    .order('nome')

  if (error) { showToast('Erro ao carregar produtos.', 'error'); return }
  todosProdutos = data || []
  renderProdutos(todosProdutos)
}

function renderProdutos(lista) {
  const tbody = document.getElementById('bodyProdutos')
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum produto encontrado.</td></tr>'
    return
  }
  tbody.innerHTML = lista.map(p => `
    <tr>
      <td>${p.nome}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${p.categoria?.nome ?? '—'}</td>
      <td class="hide-mobile" style="color:var(--text-muted);font-size:12px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.ingredientes ?? '—'}</td>
      <td><span class="price">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</span></td>
      <td><span class="badge ${p.ativo ? 'badge-ativo' : 'badge-inativo'}">${p.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="actions">
          <button class="btn-icon" title="Editar" onclick="editarProduto(${JSON.stringify(p).replace(/"/g,'&quot;')})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Inativar" onclick="confirmarExcluir('produto','${p.id}','${p.nome}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

document.getElementById('searchProduto').addEventListener('input', e => {
  const q = e.target.value.toLowerCase()
  renderProdutos(todosProdutos.filter(p =>
    p.nome.toLowerCase().includes(q) ||
    (p.categoria?.nome ?? '').toLowerCase().includes(q)
  ))
})

function abrirModalProduto(modo = 'novo', dados = null) {
  hideAlertModal('alertProduto')
  document.getElementById('pId').value = dados?.id ?? ''
  document.getElementById('pNome').value = dados?.nome ?? ''
  document.getElementById('pPreco').value = dados?.preco ?? ''
  document.getElementById('pIngredientes').value = dados?.ingredientes ?? ''
  document.getElementById('pAtivo').value = dados?.ativo !== false ? 'true' : 'false'
  document.getElementById('pCategoria').value = dados?.codigo_categoria ?? ''
  document.getElementById('modalProdutoTitulo').innerHTML =
    modo === 'novo' ? 'Novo <span>Produto</span>' : 'Editar <span>Produto</span>'
  document.getElementById('modalProdutoSub').textContent =
    modo === 'novo' ? 'Preencha os dados para cadastrar um produto.' : 'Edite os dados do produto.'
  document.getElementById('modalProduto').classList.add('open')
}

window.editarProduto = (p) => abrirModalProduto('editar', p)

document.getElementById('btnAddProduto').addEventListener('click', () => abrirModalProduto('novo'))
document.getElementById('fecharModalProduto').addEventListener('click', () => document.getElementById('modalProduto').classList.remove('open'))
document.getElementById('cancelarProduto').addEventListener('click', () => document.getElementById('modalProduto').classList.remove('open'))

document.getElementById('salvarProduto').addEventListener('click', async () => {
  hideAlertModal('alertProduto')
  const id           = document.getElementById('pId').value
  const nome         = document.getElementById('pNome').value.trim()
  const preco        = parseFloat(document.getElementById('pPreco').value)
  const ingredientes = document.getElementById('pIngredientes').value.trim()
  const ativo        = document.getElementById('pAtivo').value === 'true'
  const categoria_id = document.getElementById('pCategoria').value || null

  if (!nome)        { showAlertModal('alertProduto', 'alertProdutoText', 'Informe o nome do produto.'); return }
  if (isNaN(preco)) { showAlertModal('alertProduto', 'alertProdutoText', 'Informe um preço válido.'); return }

  const btn = document.getElementById('salvarProduto')
  btn.classList.add('loading'); btn.textContent = 'Salvando…'

  const payload = { nome, preco, ingredientes, ativo, codigo_categoria: categoria_id }

  // /produtos/add ou /produtos/edit
  const { error } = id
    ? await supabase.from('produto').update(payload).eq('id', id)
    : await supabase.from('produto').insert(payload)

  btn.classList.remove('loading'); btn.textContent = 'Salvar produto'

  if (error) { showAlertModal('alertProduto', 'alertProdutoText', error.message); return }

  document.getElementById('modalProduto').classList.remove('open')
  showToast(id ? 'Produto atualizado!' : 'Produto cadastrado!')
  carregarProdutos()
})

// ════════════════════════════════
//  EXCLUSÃO (inativação)
// ════════════════════════════════
let _excluirTipo = '', _excluirId = ''

window.confirmarExcluir = (tipo, id, nome) => {
  _excluirTipo = tipo
  _excluirId = id
  document.getElementById('textoExcluir').textContent =
    `Tem certeza que deseja inativar "${nome}"? O registro não será apagado.`
  document.getElementById('modalExcluir').classList.add('open')
}

document.getElementById('cancelarExcluir').addEventListener('click', () =>
  document.getElementById('modalExcluir').classList.remove('open'))

document.getElementById('confirmarExcluir').addEventListener('click', async () => {
  const tabela = _excluirTipo === 'produto' ? 'produto' : 'categoria'
  // /produtos/delete ou /categoria/delete → inativação via update
  const { error } = await supabase.from(tabela).update({ ativo: false }).eq('id', _excluirId)
  document.getElementById('modalExcluir').classList.remove('open')
  if (error) { showToast('Erro ao inativar.', 'error'); return }
  showToast('Item inativado com sucesso.')
  _excluirTipo === 'produto' ? carregarProdutos() : carregarCategorias()
})

// ── Fechar modais clicando fora ──
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open')
  })
})

// ── Init ──
carregarCategorias()
carregarProdutos()