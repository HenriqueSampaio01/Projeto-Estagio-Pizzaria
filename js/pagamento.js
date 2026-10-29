import { supabase } from './supabase.js'

// ════════════════════════════════════════════════════════════════
//  ESTADO DO CLIENTE, CARRINHO E ENDEREÇO SELECIONADO
// ════════════════════════════════════════════════════════════════
const clienteId   = sessionStorage.getItem('cliente_id')
const clienteNome = sessionStorage.getItem('cliente_nome')

const STORAGE_CARRINHO_KEY    = 'bs_carrinho'
const STORAGE_SELECIONADO_KEY = 'bs_endereco_selecionado'
const STORAGE_VISITANTE_KEY   = 'bs_visitante_dados'

function getCarrinho() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_CARRINHO_KEY) || '[]')
  } catch {
    return []
  }
}

function getEnderecoSelecionado() {
  try {
    const raw = localStorage.getItem(STORAGE_SELECIONADO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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
  setTimeout(() => t.classList.remove('show'), 3200)
}

function showAlertPagamento(msg) {
  document.getElementById('alertPagamentoText').textContent = msg
  document.getElementById('alertPagamento').classList.add('visible')
}
function hideAlertPagamento() {
  document.getElementById('alertPagamento').classList.remove('visible')
}

// ── Header e campos de visitante ──
const boxVisitante = document.getElementById('boxVisitante')
const visNome      = document.getElementById('visNome')
const visTelefone  = document.getElementById('visTelefone')

if (clienteId && clienteNome) {
  document.getElementById('dashUser').textContent = `Olá, ${clienteNome} · Escolha a forma de pagamento`
  boxVisitante.style.display = 'none'
} else {
  boxVisitante.style.display = 'grid'
  try {
    const salvo = JSON.parse(localStorage.getItem(STORAGE_VISITANTE_KEY) || '{}')
    if (salvo.nome)     visNome.value     = salvo.nome
    if (salvo.telefone) visTelefone.value = salvo.telefone
  } catch {
    // ignora
  }
}

visTelefone.addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6)      v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2')
  e.target.value = v
})

// ════════════════════════════════════════════════════════════════
//  EXIBIR ENDEREÇO E ITENS DO CARRINHO
// ════════════════════════════════════════════════════════════════
const enderecoAtual = getEnderecoSelecionado()
const carrinhoAtual = getCarrinho()

if (!carrinhoAtual.length) {
  window.location.href = 'carrinho.html'
}

if (!enderecoAtual) {
  window.location.href = 'endereco.html'
} else {
  const comp = enderecoAtual.complemento ? ` — ${enderecoAtual.complemento}` : ''
  document.getElementById('pagEndRua').textContent = `${enderecoAtual.logradouro}, ${enderecoAtual.numero}${comp}`
  document.getElementById('pagEndSub').textContent =
    `${enderecoAtual.bairro} · ${enderecoAtual.cidade}/${(enderecoAtual.estado || '').trim()} · CEP: ${formatarCep(enderecoAtual.cep || '')}`
}

function formatarCep(valor) {
  const v = String(valor).replace(/\D/g, '').slice(0, 8)
  if (v.length > 5) return v.replace(/(\d{5})(\d{1,3})/, '$1-$2')
  return v
}

function calcularTotalCarrinho() {
  return carrinhoAtual.reduce((soma, item) => soma + Number(item.preco) * Number(item.qty), 0)
}

function renderizarResumoPedido() {
  const listaEl = document.getElementById('resumoItensLista')
  listaEl.innerHTML = carrinhoAtual.map(item => `
    <div class="resumo-item-row">
      <div>
        <div class="resumo-item-nome">${item.qty}x ${escaparHtml(item.nome)}</div>
        ${item.obs ? `<div class="resumo-item-obs">📝 ${escaparHtml(item.obs)}</div>` : ''}
      </div>
      <div class="resumo-item-preco">R$ ${(Number(item.preco) * Number(item.qty)).toFixed(2).replace('.', ',')}</div>
    </div>
  `).join('')

  const totalFmt = `R$ ${calcularTotalCarrinho().toFixed(2).replace('.', ',')}`
  document.getElementById('pagSubtotal').textContent = totalFmt
  document.getElementById('pagTotal').textContent    = totalFmt
}

// ════════════════════════════════════════════════════════════════
//  GET /pagamentos/get — BUSCAR E RENDERIZAR FORMAS DE PAGAMENTO
// ════════════════════════════════════════════════════════════════
const PAGAMENTOS_PADRAO = [
  {
    id: 'PIX',
    tipo: 'PIX',
    icone: '⚡',
    descricao: 'Chave CNPJ ou QR Code na entrega'
  },
  {
    id: 'Cartão de Crédito',
    tipo: 'Cartão de Crédito',
    icone: '💳',
    descricao: 'Levamos a maquininha até você'
  },
  {
    id: 'Cartão de Débito',
    tipo: 'Cartão de Débito',
    icone: '🏧',
    descricao: 'Levamos a maquininha até você'
  },
  {
    id: 'Dinheiro',
    tipo: 'Dinheiro',
    icone: '💵',
    descricao: 'Pagamento em espécie na entrega'
  }
]

let opcoesPagamento = []
let pagamentoSelecionado = ''

// GET /pagamentos/get
async function carregarPagamentos() {
  try {
    const { data, error } = await supabase
      .from('pagamento')
      .select('*')

    if (!error && Array.isArray(data) && data.length > 0) {
      opcoesPagamento = data.map(p => {
        const nomeTipo = p.tipo || p.Tipo || p.nome || 'Pagamento'
        return {
          id: nomeTipo,
          tipo: nomeTipo,
          icone: obterIconePagamento(nomeTipo),
          descricao: p.status || p.Status || 'Disponível na entrega'
        }
      })
    } else {
      opcoesPagamento = PAGAMENTOS_PADRAO
    }
  } catch {
    opcoesPagamento = PAGAMENTOS_PADRAO
  }

  renderizarPickerPagamentos()
}

function obterIconePagamento(nome) {
  const n = nome.toLowerCase()
  if (n.includes('pix'))      return '⚡'
  if (n.includes('crédito') || n.includes('credito')) return '💳'
  if (n.includes('débito') || n.includes('debito'))   return '🏧'
  if (n.includes('dinheiro')) return '💵'
  return '💰'
}

// ════════════════════════════════════════════════════════════════
//  PICKER PARA SELECIONAR PAGAMENTOS APÓS O PEDIDO (REQ. 10)
// ════════════════════════════════════════════════════════════════
const pickerSelect = document.getElementById('pickerPagamento')
const cardsGrid    = document.getElementById('pagamentoCardsGrid')

function renderizarPickerPagamentos() {
  pickerSelect.innerHTML =
    '<option value="">Selecione uma forma de pagamento…</option>' +
    opcoesPagamento.map(op => `<option value="${escaparHtml(op.tipo)}">${op.icone} ${escaparHtml(op.tipo)} — ${escaparHtml(op.descricao)}</option>`).join('')

  cardsGrid.innerHTML = opcoesPagamento.map(op => `
    <div class="pagamento-option-card ${pagamentoSelecionado === op.tipo ? 'selected' : ''}" data-tipo="${escaparHtml(op.tipo)}">
      <div class="pagamento-icon">${op.icone}</div>
      <div class="pagamento-meta">
        <div class="pagamento-nome">${escaparHtml(op.tipo)}</div>
        <div class="pagamento-desc">${escaparHtml(op.descricao)}</div>
      </div>
    </div>
  `).join('')

  cardsGrid.querySelectorAll('.pagamento-option-card').forEach(card => {
    card.addEventListener('click', () => {
      selecionarMetodoPagamento(card.dataset.tipo)
    })
  })
}

pickerSelect.addEventListener('change', e => {
  selecionarMetodoPagamento(e.target.value)
})

function selecionarMetodoPagamento(tipo) {
  hideAlertPagamento()
  pagamentoSelecionado = tipo
  pickerSelect.value = tipo

  cardsGrid.querySelectorAll('.pagamento-option-card').forEach(card => {
    card.classList.toggle('selected', card.dataset.tipo === tipo)
  })

  document.getElementById('pagMetodoResumo').textContent = tipo || 'Não selecionada'

  const tLower = (tipo || '').toLowerCase()
  document.getElementById('detalhePix').classList.toggle('visible', tLower.includes('pix'))
  document.getElementById('detalheDinheiro').classList.toggle('visible', tLower.includes('dinheiro'))
  document.getElementById('detalheCartao').classList.toggle('visible', tLower.includes('cartão') || tLower.includes('cartao') || tLower.includes('crédito') || tLower.includes('débito'))
}

// ── Interações de Troco e PIX ──
const chkPrecisaTroco = document.getElementById('chkPrecisaTroco')
const wrapValorTroco  = document.getElementById('wrapValorTroco')
const inputTrocoPara  = document.getElementById('inputTrocoPara')

chkPrecisaTroco.addEventListener('change', () => {
  wrapValorTroco.style.display = chkPrecisaTroco.checked ? 'block' : 'none'
  if (chkPrecisaTroco.checked) inputTrocoPara.focus()
})

document.getElementById('btnCopiarPix').addEventListener('click', async () => {
  const chave = document.getElementById('chavePixTexto').textContent
  try {
    await navigator.clipboard.writeText(chave)
    showToast('Chave PIX CNPJ copiada!')
  } catch {
    showToast(`Chave PIX: ${chave}`)
  }
})

// ════════════════════════════════════════════════════════════════
//  CONFIRMAR E REGISTRAR PEDIDO NO SUPABASE
// ════════════════════════════════════════════════════════════════
document.getElementById('btnConfirmarPedido').addEventListener('click', async () => {
  hideAlertPagamento()

  if (!carrinhoAtual.length) {
    showAlertPagamento('Seu carrinho está vazio.')
    return
  }

  if (!enderecoAtual) {
    showAlertPagamento('Selecione um endereço de entrega antes de finalizar.')
    return
  }

  let nomeRecebedor = clienteNome || ''
  let telRecebedor  = ''
  if (!clienteId) {
    nomeRecebedor = visNome.value.trim()
    telRecebedor  = visTelefone.value.trim()
    if (!nomeRecebedor) {
      showAlertPagamento('Informe seu nome no bloco "Local de Entrega" para identificarmos seu pedido.')
      visNome.focus()
      return
    }
    localStorage.setItem(STORAGE_VISITANTE_KEY, JSON.stringify({ nome: nomeRecebedor, telefone: telRecebedor }))
  }

  if (!pagamentoSelecionado) {
    showAlertPagamento('Selecione uma forma de pagamento para concluir o pedido.')
    pickerSelect.focus()
    return
  }

  const totalPedido = calcularTotalCarrinho()
  let descricaoPagamento = pagamentoSelecionado

  if (pagamentoSelecionado.toLowerCase().includes('dinheiro') && chkPrecisaTroco.checked) {
    const valorTroco = parseFloat(inputTrocoPara.value)
    if (isNaN(valorTroco) || valorTroco < totalPedido) {
      showAlertPagamento(`Informe um valor para troco igual ou maior que o total do pedido (R$ ${totalPedido.toFixed(2).replace('.', ',')}).`)
      inputTrocoPara.focus()
      return
    }
    descricaoPagamento = `Dinheiro (Troco para R$ ${valorTroco.toFixed(2).replace('.', ',')})`
  }

  const btn = document.getElementById('btnConfirmarPedido')
  btn.classList.add('loading')
  btn.textContent = 'Enviando pedido…'

  try {
    let enderecoIdBanco = null
    if (enderecoAtual.id && !String(enderecoAtual.id).startsWith('local_')) {
      enderecoIdBanco = Number(enderecoAtual.id)
    } else {
      const payloadEnd = {
        logradouro: enderecoAtual.logradouro,
        numero: enderecoAtual.numero,
        complemento: enderecoAtual.complemento || null,
        bairro: enderecoAtual.bairro,
        cidade: enderecoAtual.cidade,
        estado: (enderecoAtual.estado || 'SP').trim().toUpperCase(),
        cep: String(enderecoAtual.cep || '').replace(/\D/g, ''),
        cliente_id: clienteId ? Number(clienteId) : null
      }
      const { data: endInserido } = await supabase.from('endereco').insert(payloadEnd).select('id').single()
      if (endInserido && endInserido.id) {
        enderecoIdBanco = endInserido.id
      }
    }

    const obsDigitada = document.getElementById('obsPedido').value.trim()
    const resumoEndStr = `${enderecoAtual.logradouro}, ${enderecoAtual.numero}${enderecoAtual.complemento ? ' (' + enderecoAtual.complemento + ')' : ''} - ${enderecoAtual.bairro}, ${enderecoAtual.cidade}/${(enderecoAtual.estado || '').trim()} - CEP ${formatarCep(enderecoAtual.cep || '')}`
    const partesObs = []
    if (nomeRecebedor) partesObs.push(`Cliente: ${nomeRecebedor}${telRecebedor ? ' (' + telRecebedor + ')' : ''}`)
    partesObs.push(`Entrega: ${resumoEndStr}`)
    if (obsDigitada) partesObs.push(`Obs: ${obsDigitada}`)

    const payloadPedido = {
      endereco_id: enderecoIdBanco,
      status: 'Pendente',
      forma_pagamento: `${descricaoPagamento} | Aguardando pagamento`,
      total: totalPedido,
      observacao: partesObs.join(' | ')
    }

    const { data: novoPedido, error: errPedido } = await supabase
      .from('pedido')
      .insert(payloadPedido)
      .select()
      .single()

    if (errPedido) {
      btn.classList.remove('loading')
      btn.textContent = 'Confirmar e enviar pedido'
      showAlertPagamento('Não foi possível registrar o pedido: ' + errPedido.message)
      return
    }

    if (novoPedido && novoPedido.id) {
      const itensPayload = carrinhoAtual.map(item => ({
        pedido_id: novoPedido.id,
        produto_id: Number(item.id),
        quantidade: Number(item.qty),
        preco_unitario: Number(item.preco),
        observacao: item.obs || null
      }))
      await supabase.from('item_pedido').insert(itensPayload)
    }

    localStorage.removeItem(STORAGE_CARRINHO_KEY)

    const codigoPedido = novoPedido?.id ? `#${novoPedido.id}` : `#${Math.floor(1000 + Math.random() * 9000)}`
    document.getElementById('sucessoResumoBox').innerHTML = `
      <div><strong>Pedido:</strong> ${codigoPedido}</div>
      <div><strong>Recebedor:</strong> ${escaparHtml(nomeRecebedor || 'Cliente')}</div>
      <div><strong>Endereço:</strong> ${escaparHtml(resumoEndStr)}</div>
      <div><strong>Pagamento:</strong> ${escaparHtml(descricaoPagamento)}</div>
      <div><strong>Total:</strong> R$ ${totalPedido.toFixed(2).replace('.', ',')}</div>
    `
    document.getElementById('modalSucessoPedido').classList.add('open')
  } catch (err) {
    showAlertPagamento('Erro inesperado ao enviar pedido. Tente novamente.')
  } finally {
    btn.classList.remove('loading')
    btn.textContent = 'Confirmar e enviar pedido'
  }
})

document.getElementById('btnVoltarInicio').addEventListener('click', () => {
  window.location.href = 'index.html'
})

function escaparHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Inicialização ──
renderizarResumoPedido()
carregarPagamentos()
