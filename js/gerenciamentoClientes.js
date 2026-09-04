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

// ── Máscara CPF ──
document.getElementById('clCpf').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  e.target.value = v
})

// ── Máscara telefone ──
document.getElementById('clTelefone').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6) v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2')
  e.target.value = v
})

// ── Toggle senha ──
document.getElementById('toggleSenhaCliente').addEventListener('click', () => {
  const input = document.getElementById('clSenha')
  const eye = document.getElementById('eyeCliente')
  const isPass = input.type === 'password'
  input.type = isPass ? 'text' : 'password'
  eye.innerHTML = isPass
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
})

// ════════════════════════════════
//  CLIENTES — GET /usuario/list
// ════════════════════════════════
let todosClientes = []

async function carregarClientes() {
  const { data, error } = await supabase
    .from('cliente')
    .select('*')
    .order('nome')

  if (error) { showToast('Erro ao carregar clientes.', 'error'); return }
  todosClientes = data || []
  renderClientes(todosClientes)
}

function renderClientes(lista) {
  const tbody = document.getElementById('bodyClientes')
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum cliente encontrado.</td></tr>'
    return
  }
  tbody.innerHTML = lista.map(c => `
    <tr>
      <td>${c.nome}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${c.cpf ?? '—'}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${c.email ?? '—'}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${c.telefone ?? '—'}</td>
      <td><span class="badge ${c.ativo ? 'badge-ativo' : 'badge-inativo'}">${c.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>
        <div class="actions">
          <button class="btn-icon" title="Editar" onclick="editarCliente(${JSON.stringify(c).replace(/"/g,'&quot;')})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" title="Inativar" onclick="abrirInativar('${c.id}','${c.nome}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
          </button>
          <button class="btn-icon danger" title="Excluir" onclick="abrirExcluir('${c.id}','${c.nome}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('')
}

document.getElementById('searchCliente').addEventListener('input', e => {
  const q = e.target.value.toLowerCase()
  renderClientes(todosClientes.filter(c =>
    c.nome.toLowerCase().includes(q) ||
    (c.email ?? '').toLowerCase().includes(q) ||
    (c.cpf ?? '').includes(q)
  ))
})

// ── Modal cliente ──
function abrirModalCliente(modo = 'novo', dados = null) {
  hideAlertModal('alertCliente')
  document.getElementById('clId').value       = dados?.id ?? ''
  document.getElementById('clNome').value     = dados?.nome ?? ''
  document.getElementById('clCpf').value      = dados?.cpf ?? ''
  document.getElementById('clEmail').value    = dados?.email ?? ''
  document.getElementById('clTelefone').value = dados?.telefone ?? ''
  document.getElementById('clAtivo').value    = dados?.ativo !== false ? 'true' : 'false'
  document.getElementById('clSenha').value    = ''

  const senhaField = document.getElementById('senhaField')
  const senhaHint  = document.getElementById('senhaHint')

  if (modo === 'editar') {
    senhaHint.textContent = 'Deixe em branco para manter a senha atual.'
    document.getElementById('modalClienteTitulo').innerHTML = 'Editar <span>Cliente</span>'
    document.getElementById('modalClienteSub').textContent  = 'Edite os dados do cliente.'
  } else {
    senhaHint.textContent = ''
    document.getElementById('modalClienteTitulo').innerHTML = 'Novo <span>Cliente</span>'
    document.getElementById('modalClienteSub').textContent  = 'Preencha os dados para cadastrar um cliente.'
  }

  document.getElementById('modalCliente').classList.add('open')
}

window.editarCliente = (c) => abrirModalCliente('editar', c)

document.getElementById('btnAddCliente').addEventListener('click', () => abrirModalCliente('novo'))
document.getElementById('fecharModalCliente').addEventListener('click', () => document.getElementById('modalCliente').classList.remove('open'))
document.getElementById('cancelarCliente').addEventListener('click', () => document.getElementById('modalCliente').classList.remove('open'))

// POST /usuario/add  |  PUT /usuario/edit
document.getElementById('salvarCliente').addEventListener('click', async () => {
  hideAlertModal('alertCliente')

  const id       = document.getElementById('clId').value
  const nome     = document.getElementById('clNome').value.trim()
  const cpf      = document.getElementById('clCpf').value.trim()
  const email    = document.getElementById('clEmail').value.trim()
  const telefone = document.getElementById('clTelefone').value.trim()
  const ativo    = document.getElementById('clAtivo').value === 'true'
  const senha    = document.getElementById('clSenha').value

  if (!nome)  { showAlertModal('alertCliente', 'alertClienteText', 'Informe o nome do cliente.'); return }
  if (!email) { showAlertModal('alertCliente', 'alertClienteText', 'Informe o e-mail.'); return }
  if (!id && !senha) { showAlertModal('alertCliente', 'alertClienteText', 'Informe uma senha para o novo cliente.'); return }
  if (senha && senha.length < 6) { showAlertModal('alertCliente', 'alertClienteText', 'A senha deve ter no mínimo 6 caracteres.'); return }

  const btn = document.getElementById('salvarCliente')
  btn.classList.add('loading'); btn.textContent = 'Salvando…'

  const payload = { nome, cpf, email, telefone, ativo }
  if (senha) payload.senha = senha // TODO: aplicar hash no backend antes de salvar

  let error
  if (id) {
    // PUT /usuario/edit
    ;({ error } = await supabase.from('cliente').update(payload).eq('id', id))
  } else {
    // POST /usuario/add
    ;({ error } = await supabase.from('cliente').insert(payload))
  }

  btn.classList.remove('loading'); btn.textContent = 'Salvar cliente'

  if (error) { showAlertModal('alertCliente', 'alertClienteText', error.message); return }

  document.getElementById('modalCliente').classList.remove('open')
  showToast(id ? 'Cliente atualizado!' : 'Cliente cadastrado!')
  carregarClientes()
})

// ── PUT /usuario/inativar ──
let _inativarId = ''

window.abrirInativar = (id, nome) => {
  _inativarId = id
  document.getElementById('textoInativar').textContent =
    `Tem certeza que deseja inativar "${nome}"?`
  document.getElementById('modalInativar').classList.add('open')
}

document.getElementById('cancelarInativar').addEventListener('click', () =>
  document.getElementById('modalInativar').classList.remove('open'))

document.getElementById('confirmarInativar').addEventListener('click', async () => {
  const { error } = await supabase
    .from('cliente')
    .update({ ativo: false })
    .eq('id', _inativarId)

  document.getElementById('modalInativar').classList.remove('open')
  if (error) { showToast('Erro ao inativar cliente.', 'error'); return }
  showToast('Cliente inativado.')
  carregarClientes()
})

// ── DELETE /usuario/delete ──
let _excluirId = ''

window.abrirExcluir = (id, nome) => {
  _excluirId = id
  document.getElementById('textoExcluir').textContent =
    `Tem certeza que deseja excluir "${nome}"? Esta ação não pode ser desfeita.`
  document.getElementById('modalExcluir').classList.add('open')
}

document.getElementById('cancelarExcluir').addEventListener('click', () =>
  document.getElementById('modalExcluir').classList.remove('open'))

document.getElementById('confirmarExcluir').addEventListener('click', async () => {
  const { error } = await supabase
    .from('cliente')
    .delete()
    .eq('id', _excluirId)

  document.getElementById('modalExcluir').classList.remove('open')
  if (error) { showToast('Erro ao excluir cliente.', 'error'); return }
  showToast('Cliente excluído.')
  carregarClientes()
})

// ════════════════════════════════
//  ENDEREÇOS (somente leitura)
// ════════════════════════════════
let todosEnderecos = []

async function carregarEnderecos() {
  const { data, error } = await supabase
    .from('endereco')
    .select('*, cliente(nome)')
    .order('cidade')

  if (error) { showToast('Erro ao carregar endereços.', 'error'); return }
  todosEnderecos = data || []
  renderEnderecos(todosEnderecos)
}

function renderEnderecos(lista) {
  const tbody = document.getElementById('bodyEnderecos')
  if (!lista.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Nenhum endereço cadastrado.</td></tr>'
    return
  }
  tbody.innerHTML = lista.map(e => `
    <tr>
      <td>${e.cliente?.nome ?? '—'}</td>
      <td>${e.logradouro}${e.numero ? ', ' + e.numero : ''}${e.complemento ? ' - ' + e.complemento : ''}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${e.bairro}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${e.cidade} / ${e.estado}</td>
      <td class="hide-mobile" style="color:var(--text-muted);">${e.cep}</td>
    </tr>
  `).join('')
}

document.getElementById('searchEndereco').addEventListener('input', e => {
  const q = e.target.value.toLowerCase()
  renderEnderecos(todosEnderecos.filter(en =>
    en.cidade.toLowerCase().includes(q) ||
    en.bairro.toLowerCase().includes(q) ||
    (en.cliente?.nome ?? '').toLowerCase().includes(q)
  ))
})

// ── Fechar modais clicando fora ──
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open')
  })
})

// ── Init ──
carregarClientes()
carregarEnderecos()