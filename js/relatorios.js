import { supabase } from './supabase.js'
import {
  obterLogsAuditoriaLocais,
  extrairInfoPagamento
} from './auditoria.js'

// ── Verificação de acesso restrito aos Administradores ──
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  window.location.href = '../adm/loginAdm.html'
} else {
  const nome = session.user?.user_metadata?.nome || session.user?.email
  document.getElementById('dashUser').textContent = 'Olá, ' + nome + ' · Relatórios e Logs de Auditoria'
}

document.getElementById('btnLogout').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = '../adm/loginAdm.html'
})

// ── Abas (com suporte a ?tab=logs na URL) ──
function ativarAba(nomeAba) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === nomeAba)
  })
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === 'tab-' + nomeAba)
  })
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => ativarAba(btn.dataset.tab))
})

const paramsUrl = new URLSearchParams(window.location.search)
if (paramsUrl.get('tab') && ['pedidos', 'clientes', 'logs'].includes(paramsUrl.get('tab'))) {
  ativarAba(paramsUrl.get('tab'))
}

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

// ════════════════════════════════════════════════════════════════
//  1. RELATÓRIO DE PEDIDOS REALIZADOS (INCLUI ENTREGUES/DESATIVADOS)
// ════════════════════════════════════════════════════════════════
let historicoPedidos = []
let pedidosFiltradosAtuais = []

async function carregarRelatorioPedidos() {
  const { data, error } = await supabase
    .from('pedido')
    .select('*, endereco(*), item_pedido(*, produto(nome))')
    .order('criado_em', { ascending: false })

  if (error) {
    const { data: simples } = await supabase.from('pedido').select('*').order('id', { ascending: false })
    historicoPedidos = simples || []
  } else {
    historicoPedidos = data || []
  }

  renderizarRelatorioPedidos()
}

function pedidoEhEntregue(p) {
  const st = String(p.status || '').toLowerCase()
  return st === 'entregue' || st === 'concluído' || st === 'concluido' || p.ativo === false
}

function renderizarRelatorioPedidos() {
  const q = document.getElementById('searchRelPedido').value.trim().toLowerCase()
  const periodo = document.getElementById('filtroRelPeriodo').value
  const statusFiltro = document.getElementById('filtroRelStatusPedido').value
  const pagFiltro = document.getElementById('filtroRelStatusPag').value

  const agora = new Date()

  pedidosFiltradosAtuais = historicoPedidos.filter(p => {
    if (periodo !== 'todos' && p.criado_em) {
      const dataPed = new Date(p.criado_em)
      if (periodo === 'hoje') {
        if (dataPed.toDateString() !== agora.toDateString()) return false
      } else if (periodo === '7dias') {
        if ((agora - dataPed) > 7 * 24 * 60 * 60 * 1000) return false
      } else if (periodo === 'mes') {
        if ((agora - dataPed) > 30 * 24 * 60 * 60 * 1000) return false
      }
    }

    const isEntregue = pedidoEhEntregue(p)
    const stNorm = isEntregue ? 'Entregue' : (p.status || 'Pendente')
    if (statusFiltro === 'Entregue' && !isEntregue) return false
    if (statusFiltro === 'ativos' && isEntregue) return false
    if (['Pendente', 'Preparando', 'Saiu para entrega'].includes(statusFiltro) && stNorm !== statusFiltro) {
      return false
    }

    const infoPag = extrairInfoPagamento(p)
    if (pagFiltro !== 'todos' && infoPag.statusPagamento !== pagFiltro) return false

    if (q) {
      const idStr = String(p.id)
      const obsStr = String(p.observacao || '').toLowerCase()
      const pagStr = String(p.forma_pagamento || '').toLowerCase()
      const endStr = p.endereco
        ? `${p.endereco.logradouro} ${p.endereco.bairro} ${p.endereco.cidade}`.toLowerCase()
        : ''
      return idStr.includes(q) || obsStr.includes(q) || pagStr.includes(q) || endStr.includes(q)
    }

    return true
  })

  const totalQtd = pedidosFiltradosAtuais.length
  const entreguesQtd = pedidosFiltradosAtuais.filter(p => pedidoEhEntregue(p)).length
  const somaTotal = pedidosFiltradosAtuais.reduce((acc, p) => acc + Number(p.total || 0), 0)
  const somaPago = pedidosFiltradosAtuais
    .filter(p => extrairInfoPagamento(p).statusPagamento === 'Pagamento realizado')
    .reduce((acc, p) => acc + Number(p.total || 0), 0)

  document.getElementById('relPedTotalQtd').textContent     = totalQtd
  document.getElementById('relPedEntreguesQtd').textContent = entreguesQtd
  document.getElementById('relPedValorTotal').textContent   = `R$ ${somaTotal.toFixed(2).replace('.', ',')}`
  document.getElementById('relPedValorPago').textContent    = `R$ ${somaPago.toFixed(2).replace('.', ',')}`

  const tbody = document.getElementById('bodyRelPedidos')
  if (!pedidosFiltradosAtuais.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum pedido encontrado para os filtros selecionados.</td></tr>'
    return
  }

  tbody.innerHTML = pedidosFiltradosAtuais.map(p => {
    const isEntregue = pedidoEhEntregue(p)
    const statusLabel = isEntregue ? 'Entregue (Desativado)' : (p.status || 'Pendente')
    const badgeStatus = isEntregue
      ? 'badge-ativo'
      : statusLabel === 'Saiu para entrega'
      ? 'badge-saiu'
      : statusLabel === 'Preparando'
      ? 'badge-preparando'
      : 'badge-pendente'

    const infoPag = extrairInfoPagamento(p)
    const badgePag = infoPag.statusPagamento === 'Pagamento realizado' ? 'badge-ativo' : 'badge-inativo'

    const itensResumo = Array.isArray(p.item_pedido) && p.item_pedido.length
      ? p.item_pedido.map(i => `${i.quantidade}x ${i.produto?.nome || 'Item #' + i.produto_id}`).join(', ')
      : '—'

    const endTexto = p.endereco
      ? `${p.endereco.logradouro}, ${p.endereco.numero} — ${p.endereco.bairro} (${p.endereco.cidade}/${(p.endereco.estado || '').trim()})`
      : (p.observacao || '—')

    return `
      <tr>
        <td><strong>#${p.id}</strong></td>
        <td>${formatarDataHora(p.criado_em)}</td>
        <td>
          <div>${escaparHtml(endTexto)}</div>
          ${p.observacao && p.endereco ? `<div class="muted-sub">${escaparHtml(p.observacao)}</div>` : ''}
        </td>
        <td class="hide-mobile" style="max-width:240px;">${escaparHtml(itensResumo)}</td>
        <td>
          <div>${escaparHtml(infoPag.metodo)}</div>
          <div style="margin-top:4px;"><span class="badge ${badgePag}">${escaparHtml(infoPag.statusPagamento)}</span></div>
        </td>
        <td><span class="badge ${badgeStatus}">${escaparHtml(statusLabel)}</span></td>
        <td class="price-cell">R$ ${Number(p.total || 0).toFixed(2).replace('.', ',')}</td>
      </tr>
    `
  }).join('')
}

;['searchRelPedido', 'filtroRelPeriodo', 'filtroRelStatusPedido', 'filtroRelStatusPag'].forEach(id => {
  document.getElementById(id).addEventListener('input', renderizarRelatorioPedidos)
  document.getElementById(id).addEventListener('change', renderizarRelatorioPedidos)
})

// ════════════════════════════════════════════════════════════════
//  2. RELATÓRIO DE CLIENTES CADASTRADOS
// ════════════════════════════════════════════════════════════════
let historicoClientes = []
let historicoEnderecos = []
let clientesFiltradosAtuais = []

async function carregarRelatorioClientes() {
  const [{ data: clientes }, { data: enderecos }] = await Promise.all([
    supabase.from('cliente').select('*').order('nome'),
    supabase.from('endereco').select('*')
  ])

  historicoClientes = clientes || []
  historicoEnderecos = enderecos || []

  document.getElementById('relCliTotal').textContent     = historicoClientes.length
  document.getElementById('relCliAtivos').textContent    = historicoClientes.filter(c => c.ativo !== false).length
  document.getElementById('relCliInativos').textContent  = historicoClientes.filter(c => c.ativo === false).length
  document.getElementById('relCliEnderecos').textContent = historicoEnderecos.length

  renderizarRelatorioClientes()
}

function renderizarRelatorioClientes() {
  const q = document.getElementById('searchRelCliente').value.trim().toLowerCase()
  const stFiltro = document.getElementById('filtroRelStatusCliente').value

  clientesFiltradosAtuais = historicoClientes.filter(c => {
    if (stFiltro === 'ativos' && c.ativo === false) return false
    if (stFiltro === 'inativos' && c.ativo !== false) return false

    const endsCliente = historicoEnderecos.filter(e => Number(e.cliente_id) === Number(c.id))
    const endStr = endsCliente.map(e => `${e.logradouro} ${e.bairro} ${e.cidade}`).join(' ').toLowerCase()

    if (q) {
      return (
        String(c.nome || '').toLowerCase().includes(q) ||
        String(c.cpf || '').toLowerCase().includes(q) ||
        String(c.email || '').toLowerCase().includes(q) ||
        endStr.includes(q)
      )
    }
    return true
  })

  const tbody = document.getElementById('bodyRelClientes')
  if (!clientesFiltradosAtuais.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="7">Nenhum cliente encontrado.</td></tr>'
    return
  }

  tbody.innerHTML = clientesFiltradosAtuais.map(c => {
    const ends = historicoEnderecos.filter(e => Number(e.cliente_id) === Number(c.id))
    const endResumo = ends.length
      ? ends.map(e => `${e.logradouro}, ${e.numero} (${e.bairro} - ${e.cidade}/${(e.estado || '').trim()})`).join('<br>')
      : '<span class="muted-sub">Sem endereço vinculado</span>'

    return `
      <tr>
        <td style="color:var(--text-muted);">#${c.id}</td>
        <td><strong>${escaparHtml(c.nome)}</strong></td>
        <td class="hide-mobile">${escaparHtml(c.cpf || '—')}</td>
        <td>
          <div>${escaparHtml(c.email || '—')}</div>
          <div class="muted-sub">${escaparHtml(c.telefone || 'Sem telefone')}</div>
        </td>
        <td class="hide-mobile">${endResumo}</td>
        <td class="hide-mobile">${formatarDataHora(c.created_at)}</td>
        <td>
          <span class="badge ${c.ativo !== false ? 'badge-ativo' : 'badge-inativo'}">
            ${c.ativo !== false ? 'Ativo' : 'Inativo'}
          </span>
        </td>
      </tr>
    `
  }).join('')
}

document.getElementById('searchRelCliente').addEventListener('input', renderizarRelatorioClientes)
document.getElementById('filtroRelStatusCliente').addEventListener('change', renderizarRelatorioClientes)

// ════════════════════════════════════════════════════════════════
//  3. LOGS DE AUDITORIA (TELA RESTRITA AOS ADM)
// ════════════════════════════════════════════════════════════════
let todosLogsCombinados = []
let logsFiltradosAtuais = []

async function carregarLogsAuditoria() {
  const logsLocais = obterLogsAuditoriaLocais()
  let logsBanco = []

  try {
    const { data, error } = await supabase
      .from('log_auditoria')
      .select('*')
      .order('criado_em', { ascending: false })
      .limit(200)
    if (!error && Array.isArray(data)) {
      logsBanco = data.map(l => ({
        id: 'db_' + l.id,
        data_hora: l.criado_em,
        usuario: l.usuario || 'Administrador',
        modulo: l.modulo || 'Sistema',
        acao: l.acao || 'Registro',
        referencia: l.referencia || '—',
        detalhes: l.detalhes || ''
      }))
    }
  } catch {
    // fallback para logs locais + histórico reconstruído do banco
  }

  const logsReconstruidos = []
  historicoPedidos.forEach(p => {
    const infoPag = extrairInfoPagamento(p)
    const isEnt = pedidoEhEntregue(p)
    logsReconstruidos.push({
      id: 'ped_create_' + p.id,
      data_hora: p.criado_em,
      usuario: isEnt ? 'Sistema / Administração' : 'Cliente / Site',
      modulo: 'Pedidos',
      acao: isEnt ? 'Pedido Entregue (Desativado)' : `Pedido Registrado (${p.status || 'Pendente'})`,
      referencia: `Pedido #${p.id}`,
      detalhes: `Total R$ ${Number(p.total || 0).toFixed(2).replace('.', ',')} · Pagamento: ${infoPag.metodo} (${infoPag.statusPagamento}).`
    })
  })

  historicoClientes.forEach(c => {
    if (c.created_at) {
      logsReconstruidos.push({
        id: 'cli_create_' + c.id,
        data_hora: c.created_at,
        usuario: 'Sistema / Administração',
        modulo: 'Clientes',
        acao: c.ativo !== false ? 'Cadastro de Cliente' : 'Cliente Inativado',
        referencia: `Cliente #${c.id}`,
        detalhes: `Cliente "${c.nome}" (${c.email || 'sem e-mail'}) — Status: ${c.ativo !== false ? 'Ativo' : 'Inativo'}.`
      })
    }
  })

  const mapa = new Map()
  ;[...logsBanco, ...logsLocais, ...logsReconstruidos].forEach(item => {
    const chave = `${item.modulo}-${item.acao}-${item.referencia}-${item.detalhes}`
    if (!mapa.has(chave)) mapa.set(chave, item)
  })

  todosLogsCombinados = Array.from(mapa.values()).sort((a, b) => {
    return new Date(b.data_hora || 0) - new Date(a.data_hora || 0)
  })

  renderizarLogsAuditoria()
}

function renderizarLogsAuditoria() {
  const q = document.getElementById('searchRelLogs').value.trim().toLowerCase()
  const modFiltro = document.getElementById('filtroRelModuloLog').value

  logsFiltradosAtuais = todosLogsCombinados.filter(l => {
    if (modFiltro !== 'todos' && l.modulo !== modFiltro) return false
    if (q) {
      return (
        String(l.usuario || '').toLowerCase().includes(q) ||
        String(l.acao || '').toLowerCase().includes(q) ||
        String(l.referencia || '').toLowerCase().includes(q) ||
        String(l.detalhes || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const tbody = document.getElementById('bodyRelLogs')
  if (!logsFiltradosAtuais.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="6">Nenhum log de auditoria encontrado.</td></tr>'
    return
  }

  tbody.innerHTML = logsFiltradosAtuais.map(l => `
    <tr>
      <td style="white-space:nowrap;color:var(--text-muted);">${formatarDataHora(l.data_hora)}</td>
      <td><strong>${escaparHtml(l.usuario)}</strong></td>
      <td><span class="badge badge-preparando">${escaparHtml(l.modulo)}</span></td>
      <td>${escaparHtml(l.acao)}</td>
      <td style="white-space:nowrap;">${escaparHtml(l.referencia)}</td>
      <td style="color:var(--text-muted);">${escaparHtml(l.detalhes)}</td>
    </tr>
  `).join('')
}

document.getElementById('searchRelLogs').addEventListener('input', renderizarLogsAuditoria)
document.getElementById('filtroRelModuloLog').addEventListener('change', renderizarLogsAuditoria)

// ── Exportação CSV ──
function baixarCsv(nomeArquivo, cabecalhos, linhas) {
  const escaparCsv = val => `"${String(val ?? '').replace(/"/g, '""')}"`
  const conteudo = [
    cabecalhos.map(escaparCsv).join(';'),
    ...linhas.map(l => l.map(escaparCsv).join(';'))
  ].join('\r\n')

  const blob = new Blob(['\uFEFF' + conteudo], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nomeArquivo
  a.click()
  URL.revokeObjectURL(url)
  showToast('Relatório CSV exportado!')
}

document.getElementById('btnExportarPedidosCsv').addEventListener('click', () => {
  const linhas = pedidosFiltradosAtuais.map(p => {
    const infoPag = extrairInfoPagamento(p)
    const statusLabel = pedidoEhEntregue(p) ? 'Entregue (Desativado)' : (p.status || 'Pendente')
    return [
      p.id,
      formatarDataHora(p.criado_em),
      statusLabel,
      infoPag.metodo,
      infoPag.statusPagamento,
      Number(p.total || 0).toFixed(2).replace('.', ','),
      p.observacao || ''
    ]
  })
  baixarCsv('relatorio_pedidos_realizados.csv', ['ID', 'Data/Hora', 'Status do Pedido', 'Forma de Pagamento', 'Status do Pagamento', 'Total (R$)', 'Observações'], linhas)
})

document.getElementById('btnExportarClientesCsv').addEventListener('click', () => {
  const linhas = clientesFiltradosAtuais.map(c => [
    c.id,
    c.nome,
    c.cpf || '',
    c.email || '',
    c.telefone || '',
    c.ativo !== false ? 'Ativo' : 'Inativo',
    formatarDataHora(c.created_at)
  ])
  baixarCsv('relatorio_clientes_cadastrados.csv', ['ID', 'Nome', 'CPF', 'E-mail', 'Telefone', 'Status', 'Data de Cadastro'], linhas)
})

document.getElementById('btnExportarLogsCsv').addEventListener('click', () => {
  const linhas = logsFiltradosAtuais.map(l => [
    formatarDataHora(l.data_hora),
    l.usuario,
    l.modulo,
    l.acao,
    l.referencia,
    l.detalhes
  ])
  baixarCsv('logs_auditoria.csv', ['Data/Hora', 'Responsável', 'Módulo', 'Ação', 'Referência', 'Detalhes'], linhas)
})

function formatarDataHora(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

function escaparHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Inicialização Completa ──
async function init() {
  await Promise.all([carregarRelatorioPedidos(), carregarRelatorioClientes()])
  await carregarLogsAuditoria()
}
init()
