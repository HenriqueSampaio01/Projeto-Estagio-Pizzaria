import { supabase } from './supabase.js'
import {
  registrarLogAuditoria,
  extrairInfoPagamento,
  montarFormaPagamentoComStatus
} from './auditoria.js'

// ── Verificação de acesso restrito aos Administradores (REQ. 1) ──
const { data: { session } } = await supabase.auth.getSession()
if (!session) {
  window.location.href = '../adm/loginAdm.html'
} else {
  const nome = session.user?.user_metadata?.nome || session.user?.email
  document.getElementById('dashUser').textContent = 'Olá, ' + nome + ' · Gerenciamento de Pedidos'
}

document.getElementById('btnLogout').addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = '../adm/loginAdm.html'
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
  setTimeout(() => t.classList.remove('show'), 3200)
}

// ════════════════════════════════════════════════════════════════
//  GET /GET-pedidos — LISTAR PEDIDOS REALIZADOS POR CLIENTES
// ════════════════════════════════════════════════════════════════
let todosPedidos = []
let visaoAtual = 'ativos' // 'ativos' | 'entregues' | 'todos'

export async function carregarPedidos() {
  const container = document.getElementById('listaPedidosContainer')
  container.innerHTML = '<div class="empty-state">Carregando pedidos…</div>'

  const { data, error } = await supabase
    .from('pedido')
    .select('*, endereco(*), item_pedido(*, produto(nome))')
    .order('criado_em', { ascending: false })

  if (error) {
    // Fallback caso alguma relação falhe
    const { data: simples, error: errSimples } = await supabase
      .from('pedido')
      .select('*')
      .order('id', { ascending: false })

    if (errSimples) {
      showToast('Erro ao carregar pedidos: ' + errSimples.message, 'error')
      container.innerHTML = '<div class="empty-state">Não foi possível carregar os pedidos.</div>'
      return
    }
    todosPedidos = simples || []
  } else {
    todosPedidos = data || []
  }

  atualizarKPIs()
  renderizarPedidos()
}

function pedidoEstaEntregueOuDesativado(p) {
  const st = String(p.status || '').toLowerCase()
  return st === 'entregue' || st === 'concluído' || st === 'concluido' || p.ativo === false
}

function atualizarKPIs() {
  const ativos = todosPedidos.filter(p => !pedidoEstaEntregueOuDesativado(p))
  const preparando = ativos.filter(p => String(p.status || '').toLowerCase() === 'preparando')
  const saiu = ativos.filter(p => String(p.status || '').toLowerCase() === 'saiu para entrega')
  const aguardandoPag = ativos.filter(p => extrairInfoPagamento(p).statusPagamento === 'Aguardando pagamento')

  document.getElementById('kpiAtivos').textContent        = ativos.length
  document.getElementById('kpiPreparando').textContent    = preparando.length
  document.getElementById('kpiSaiuEntrega').textContent   = saiu.length
  document.getElementById('kpiAguardandoPag').textContent = aguardandoPag.length
}

function renderizarPedidos() {
  const container = document.getElementById('listaPedidosContainer')
  const termo = document.getElementById('searchPedido').value.trim().toLowerCase()
  const filtroPag = document.getElementById('filtroStatusPagamento').value

  const filtrados = todosPedidos.filter(p => {
    const isEntregue = pedidoEstaEntregueOuDesativado(p)
    if (visaoAtual === 'ativos' && isEntregue) return false
    if (visaoAtual === 'entregues' && !isEntregue) return false

    const infoPag = extrairInfoPagamento(p)
    if (filtroPag !== 'todos' && infoPag.statusPagamento !== filtroPag) return false

    if (termo) {
      const idMatch = String(p.id).includes(termo)
      const obsMatch = String(p.observacao || '').toLowerCase().includes(termo)
      const endMatch = p.endereco
        ? `${p.endereco.logradouro} ${p.endereco.bairro} ${p.endereco.cidade}`.toLowerCase().includes(termo)
        : false
      const itensMatch = Array.isArray(p.item_pedido)
        ? p.item_pedido.some(i => String(i.produto?.nome || '').toLowerCase().includes(termo))
        : false
      return idMatch || obsMatch || endMatch || itensMatch
    }

    return true
  })

  if (!filtrados.length) {
    const msgVazio =
      visaoAtual === 'ativos'
        ? 'Nenhum pedido ativo na fila no momento.'
        : visaoAtual === 'entregues'
        ? 'Nenhum pedido entregue/desativado encontrado.'
        : 'Nenhum pedido encontrado com os filtros selecionados.'
    container.innerHTML = `<div class="empty-state">${msgVazio}</div>`
    return
  }

  container.innerHTML = filtrados.map(p => montarCardPedidoHTML(p)).join('')
}

function montarCardPedidoHTML(p) {
  const isEntregue = pedidoEstaEntregueOuDesativado(p)
  const statusAtual = isEntregue ? 'Entregue' : (p.status || 'Pendente')
  const infoPag = extrairInfoPagamento(p)
  const dataFmt = formatarDataHora(p.criado_em)

  const badgeStatusClass =
    statusAtual === 'Entregue'
      ? 'badge-entregue'
      : statusAtual === 'Saiu para entrega'
      ? 'badge-saiu'
      : statusAtual === 'Preparando'
      ? 'badge-preparando'
      : 'badge-pendente'

  const badgePagClass =
    infoPag.statusPagamento === 'Pagamento realizado'
      ? 'badge-pag-realizado'
      : 'badge-pag-aguardando'

  const itens = Array.isArray(p.item_pedido) ? p.item_pedido : []
  const itensHTML = itens.length
    ? itens.map(item => `
        <div>
          <div class="item-linha">
            <span><strong>${item.quantidade}x</strong> ${escaparHtml(item.produto?.nome || 'Produto #' + item.produto_id)}</span>
            <span>R$ ${(Number(item.preco_unitario) * Number(item.quantidade)).toFixed(2).replace('.', ',')}</span>
          </div>
          ${item.observacao ? `<div class="item-linha-obs">📝 ${escaparHtml(item.observacao)}</div>` : ''}
        </div>
      `).join('')
    : '<div class="entrega-sub">Itens registrados no resumo do pedido.</div>'

  const endObj = p.endereco
  const enderecoTexto = endObj
    ? `${endObj.logradouro}, ${endObj.numero}${endObj.complemento ? ' (' + endObj.complemento + ')' : ''} — ${endObj.bairro}, ${endObj.cidade}/${(endObj.estado || '').trim()}`
    : 'Consulte os dados de entrega nas observações abaixo'

  return `
    <div class="pedido-card ${isEntregue ? 'desativado' : ''}">
      <div class="pedido-top">
        <div class="pedido-id-wrap">
          <span class="pedido-num">Pedido #${p.id}</span>
          <span class="pedido-data">${dataFmt}</span>
        </div>
        <div class="badges-row">
          <span class="badge ${badgeStatusClass}">
            ${statusAtual === 'Entregue' ? '✓ Entregue (Desativado)' : statusAtual}
          </span>
          <span class="badge ${badgePagClass}">
            ${infoPag.statusPagamento === 'Pagamento realizado' ? '💚 Pagamento realizado' : '⏳ Aguardando pagamento'}
          </span>
        </div>
      </div>

      <div class="pedido-body">
        <div class="pedido-box">
          <div class="pedido-box-title">🍕 Itens do Pedido</div>
          <div class="itens-lista">${itensHTML}</div>
        </div>

        <div class="pedido-box">
          <div class="pedido-box-title">📍 Entrega e Pagamento</div>
          <div class="entrega-detalhe">${escaparHtml(enderecoTexto)}</div>
          <div class="entrega-sub"><strong>Modalidade:</strong> ${escaparHtml(infoPag.metodo)}</div>
          ${p.observacao ? `<div class="entrega-sub"><strong>Detalhes/Obs:</strong> ${escaparHtml(p.observacao)}</div>` : ''}
        </div>
      </div>

      <div class="pedido-controls">
        <div class="controls-group">
          <div class="control-field">
            <label for="selStatus_${p.id}">Status geral do pedido</label>
            <select id="selStatus_${p.id}" class="control-select" onchange="alterarStatusGeralPedido(${p.id}, this.value)">
              <option value="Pendente" ${statusAtual === 'Pendente' ? 'selected' : ''}>🕒 Pendente</option>
              <option value="Preparando" ${statusAtual === 'Preparando' ? 'selected' : ''}>🔥 Preparando</option>
              <option value="Saiu para entrega" ${statusAtual === 'Saiu para entrega' ? 'selected' : ''}>🛵 Saiu para entrega</option>
              <option value="Entregue" ${statusAtual === 'Entregue' ? 'selected' : ''}>✅ Pedido entregue (Desativar)</option>
            </select>
          </div>

          <div class="control-field">
            <label for="selPag_${p.id}">Status do pagamento</label>
            <select id="selPag_${p.id}" class="control-select" onchange="alterarStatusPagamento(${p.id}, this.value)">
              <option value="Aguardando pagamento" ${infoPag.statusPagamento === 'Aguardando pagamento' ? 'selected' : ''}>⏳ Aguardando pagamento</option>
              <option value="Pagamento realizado" ${infoPag.statusPagamento === 'Pagamento realizado' ? 'selected' : ''}>💚 Pagamento realizado</option>
            </select>
          </div>
        </div>

        <div class="pedido-actions-right">
          <div class="pedido-total-valor">R$ ${Number(p.total || 0).toFixed(2).replace('.', ',')}</div>
          ${
            !isEntregue
              ? `<button class="btn-check-entregue" type="button" onclick="abrirModalConfirmarEntrega(${p.id})" title="Marcar pedido como completo/entregue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Marcar como entregue
                </button>`
              : `<button class="btn-reativar" type="button" onclick="alterarStatusGeralPedido(${p.id}, 'Preparando')">
                  ↺ Reabrir na fila
                </button>`
          }
        </div>
      </div>
    </div>
  `
}

// ════════════════════════════════════════════════════════════════
//  ALTERAR STATUS GERAL DO PEDIDO & PUT /end-pedido (DESATIVAÇÃO)
// ════════════════════════════════════════════════════════════════
window.alterarStatusGeralPedido = async (pedidoId, novoStatus) => {
  // Se escolheu "Entregue", abre o modal de confirmação para desativar o pedido da fila ativa
  if (novoStatus === 'Entregue') {
    window.abrirModalConfirmarEntrega(pedidoId)
    return
  }

  const pedido = todosPedidos.find(p => Number(p.id) === Number(pedidoId))
  const statusAnterior = pedido?.status || 'Pendente'

  let { error } = await supabase
    .from('pedido')
    .update({ status: novoStatus })
    .eq('id', Number(pedidoId))

  if (error) {
    showToast('Erro ao atualizar status do pedido: ' + error.message, 'error')
    renderizarPedidos()
    return
  }

  if (pedido) {
    pedido.status = novoStatus
    pedido.ativo = true
  }

  await registrarLogAuditoria({
    acao: 'Alteração de Status do Pedido',
    modulo: 'Pedidos',
    referencia: `Pedido #${pedidoId}`,
    detalhes: `Status alterado de "${statusAnterior}" para "${novoStatus}".`
  })

  showToast(`Pedido #${pedidoId} atualizado para "${novoStatus}"!`)
  atualizarKPIs()
  renderizarPedidos()
}

// ── Modal de confirmação para concluir/entregar e desativar pedido (PUT /end-pedido) ──
const modalEntrega = document.getElementById('modalConfirmarEntrega')

window.abrirModalConfirmarEntrega = (pedidoId) => {
  const pedido = todosPedidos.find(p => Number(p.id) === Number(pedidoId))
  if (!pedido) return

  document.getElementById('entregaPedidoId').value = pedidoId
  document.getElementById('textoConfirmarEntrega').innerHTML =
    `Confirmar que o <strong>Pedido #${pedidoId}</strong> (R$ ${Number(pedido.total || 0).toFixed(2).replace('.', ',')}) foi entregue ao cliente?`

  const infoPag = extrairInfoPagamento(pedido)
  const chkPag = document.getElementById('chkConfirmarPagJunto')
  const wrapPag = document.getElementById('wrapConfirmarPagJunto')

  if (infoPag.statusPagamento === 'Pagamento realizado') {
    wrapPag.style.display = 'none'
    chkPag.checked = false
  } else {
    wrapPag.style.display = 'flex'
    chkPag.checked = true
  }

  modalEntrega.classList.add('open')
}

function fecharModalEntrega() {
  modalEntrega.classList.remove('open')
  renderizarPedidos() // restaura select caso tenha sido acionado via dropdown
}

document.getElementById('fecharModalEntrega').addEventListener('click', fecharModalEntrega)
document.getElementById('cancelarEntrega').addEventListener('click', fecharModalEntrega)
modalEntrega.addEventListener('click', e => {
  if (e.target === modalEntrega) fecharModalEntrega()
})

// PUT /end-pedido (quando o pedido encerrar -> marca como Entregue e desativa da fila ativa)
document.getElementById('confirmarEntregaBtn').addEventListener('click', async () => {
  const pedidoId = Number(document.getElementById('entregaPedidoId').value)
  const confirmarPagJunto = document.getElementById('chkConfirmarPagJunto').checked
  const pedido = todosPedidos.find(p => Number(p.id) === pedidoId)
  if (!pedido) return

  const btn = document.getElementById('confirmarEntregaBtn')
  btn.textContent = 'Confirmando…'
  btn.disabled = true

  const infoPag = extrairInfoPagamento(pedido)
  const novoStatusPag = confirmarPagJunto ? 'Pagamento realizado' : infoPag.statusPagamento
  const novaFormaPag = montarFormaPagamentoComStatus(infoPag.metodo, novoStatusPag)

  // Tenta atualizar status + forma_pagamento (e ativo=false caso a coluna exista)
  let { error } = await supabase
    .from('pedido')
    .update({
      status: 'Entregue',
      forma_pagamento: novaFormaPag
    })
    .eq('id', pedidoId)

  btn.textContent = '✓ Confirmar e desativar pedido'
  btn.disabled = false

  if (error) {
    showToast('Erro ao encerrar pedido: ' + error.message, 'error')
    return
  }

  pedido.status = 'Entregue'
  pedido.forma_pagamento = novaFormaPag
  pedido.ativo = false

  await registrarLogAuditoria({
    acao: 'Entrega e Desativação de Pedido',
    modulo: 'Pedidos',
    referencia: `Pedido #${pedidoId}`,
    detalhes: `Pedido #${pedidoId} marcado como Entregue (desativado da fila ativa e arquivado para relatórios). Pagamento: ${novoStatusPag}.`
  })

  modalEntrega.classList.remove('open')
  showToast(`Pedido #${pedidoId} concluído, entregue e arquivado nos relatórios!`)
  atualizarKPIs()
  renderizarPedidos()
})

// ════════════════════════════════════════════════════════════════
//  PUT /pagamento/confirm — ALTERAR STATUS DO PAGAMENTO
// ════════════════════════════════════════════════════════════════
window.alterarStatusPagamento = async (pedidoId, novoStatusPagamento) => {
  const pedido = todosPedidos.find(p => Number(p.id) === Number(pedidoId))
  if (!pedido) return

  const infoPag = extrairInfoPagamento(pedido)
  const novaFormaPag = montarFormaPagamentoComStatus(infoPag.metodo, novoStatusPagamento)

  const { error } = await supabase
    .from('pedido')
    .update({ forma_pagamento: novaFormaPag })
    .eq('id', Number(pedidoId))

  if (error) {
    showToast('Erro ao atualizar status do pagamento: ' + error.message, 'error')
    renderizarPedidos()
    return
  }

  pedido.forma_pagamento = novaFormaPag

  await registrarLogAuditoria({
    acao: 'Alteração de Status de Pagamento',
    modulo: 'Pagamentos',
    referencia: `Pedido #${pedidoId}`,
    detalhes: `Status do pagamento (${infoPag.metodo}) alterado para "${novoStatusPagamento}".`
  })

  showToast(`Pagamento do Pedido #${pedidoId}: ${novoStatusPagamento}!`)
  atualizarKPIs()
  renderizarPedidos()
}

// ── Filtros e Abas ──
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    visaoAtual = btn.dataset.visao
    renderizarPedidos()
  })
})

document.getElementById('searchPedido').addEventListener('input', renderizarPedidos)
document.getElementById('filtroStatusPagamento').addEventListener('change', renderizarPedidos)
document.getElementById('btnAtualizarPedidos').addEventListener('click', carregarPedidos)

function formatarDataHora(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
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

// ── Init ──
carregarPedidos()
