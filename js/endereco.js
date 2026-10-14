import { supabase } from './supabase.js'

// ════════════════════════════════════════════════════════════════
//  ESTADO DO CLIENTE (LOGADO vs SEM LOGIN / LOCAL STORAGE + COOKIES)
// ════════════════════════════════════════════════════════════════
const clienteId   = sessionStorage.getItem('cliente_id')
const clienteNome = sessionStorage.getItem('cliente_nome')

const STORAGE_ENDERECOS_KEY   = 'bs_enderecos_local'
const STORAGE_SELECIONADO_KEY = 'bs_endereco_selecionado'
const STORAGE_CONSENT_KEY     = 'bs_cookie_consent'

let enderecosLista = []
let enderecoSelecionado = obterEnderecoSelecionado()

// ── Configurar Header e Banner de Armazenamento (REQ. 10 e REQ. 11) ──
const dashUser           = document.getElementById('dashUser')
const storageBannerTitle = document.getElementById('storageBannerTitle')
const storageBannerDesc  = document.getElementById('storageBannerDesc')
const consentWrap        = document.getElementById('consentWrap')
const chkConsentimento   = document.getElementById('chkConsentimentoCookies')

if (clienteId && clienteNome) {
  dashUser.textContent = `Olá, ${clienteNome} · Escolha onde entregar seu pedido`
  storageBannerTitle.innerHTML = '<span>🔐</span> Conta conectada — Sincronização ativa'
  storageBannerDesc.textContent =
    'Seus endereços ficam salvos na sua conta no banco de dados e também disponíveis neste dispositivo.'
  consentWrap.style.display = 'none'
} else {
  const consentimentoSalvo = localStorage.getItem(STORAGE_CONSENT_KEY)
  chkConsentimento.checked = consentimentoSalvo !== 'false'
  if (chkConsentimento.checked) {
    salvarCookieConsentimento(true)
  }
  chkConsentimento.addEventListener('change', () => {
    salvarCookieConsentimento(chkConsentimento.checked)
    showToast(
      chkConsentimento.checked
        ? 'Consentimento ativado: endereços serão salvos no navegador.'
        : 'Consentimento desativado para novos endereços.'
    )
  })
}

function salvarCookieConsentimento(aceito) {
  localStorage.setItem(STORAGE_CONSENT_KEY, aceito ? 'true' : 'false')
  document.cookie = `bs_cookie_consent=${aceito ? 'true' : 'false'}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
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

// ── Alertas do Modal ──
function showAlertEndereco(msg) {
  document.getElementById('alertEnderecoText').textContent = msg
  document.getElementById('alertEndereco').classList.add('visible')
}
function hideAlertEndereco() {
  document.getElementById('alertEndereco').classList.remove('visible')
}

// ── Helpers LocalStorage / Cookies (REQ. 11) ──
function getEnderecosLocais() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_ENDERECOS_KEY) || '[]')
  } catch {
    return []
  }
}

function salvarEnderecosLocais(lista) {
  localStorage.setItem(STORAGE_ENDERECOS_KEY, JSON.stringify(lista))
  if (localStorage.getItem(STORAGE_CONSENT_KEY) !== 'false') {
    document.cookie = `bs_has_local_address=${lista.length > 0 ? '1' : '0'}; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`
  }
}

function obterEnderecoSelecionado() {
  try {
    const raw = localStorage.getItem(STORAGE_SELECIONADO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function definirEnderecoSelecionado(endereco) {
  enderecoSelecionado = endereco
  if (endereco) {
    localStorage.setItem(STORAGE_SELECIONADO_KEY, JSON.stringify(endereco))
  } else {
    localStorage.removeItem(STORAGE_SELECIONADO_KEY)
  }
  atualizarBarraInferior()
}

// ════════════════════════════════════════════════════════════════
//  GET /endereço/list — LISTAR ENDEREÇOS (SUPABASE + LOCALSTORAGE)
// ════════════════════════════════════════════════════════════════
async function carregarEnderecos() {
  const container = document.getElementById('listaEnderecos')
  container.innerHTML = '<div class="empty-enderecos">Carregando endereços…</div>'

  const locais = getEnderecosLocais().map(e => ({ ...e, _origem: 'local' }))
  let remotos = []

  if (clienteId) {
    const { data, error } = await supabase
      .from('endereco')
      .select('*')
      .eq('cliente_id', Number(clienteId))
      .order('id', { ascending: false })

    if (error) {
      showToast('Não foi possível consultar endereços da conta, exibindo salvos localmente.', 'error')
    } else {
      remotos = (data || []).map(e => ({ ...e, _origem: 'supabase' }))
    }
  }

  if (clienteId) {
    const chavesRemotas = new Set(
      remotos.map(r => `${(r.cep || '').replace(/\D/g, '')}-${(r.numero || '').trim().toLowerCase()}`)
    )
    const locaisNaoDuplicados = locais.filter(
      l => !chavesRemotas.has(`${(l.cep || '').replace(/\D/g, '')}-${(l.numero || '').trim().toLowerCase()}`)
    )
    enderecosLista = [...remotos, ...locaisNaoDuplicados]
  } else {
    enderecosLista = locais
  }

  if (enderecosLista.length > 0 && !enderecoSelecionado) {
    definirEnderecoSelecionado(enderecosLista[0])
  } else if (enderecoSelecionado) {
    const atualizado = enderecosLista.find(e => String(e.id) === String(enderecoSelecionado.id))
    if (atualizado) {
      definirEnderecoSelecionado(atualizado)
    } else if (enderecosLista.length > 0) {
      definirEnderecoSelecionado(enderecosLista[0])
    } else {
      definirEnderecoSelecionado(null)
    }
  }

  renderizarEnderecos()
}

function renderizarEnderecos() {
  const container = document.getElementById('listaEnderecos')

  if (!enderecosLista.length) {
    container.innerHTML = `
      <div class="empty-enderecos">
        <div style="font-size:40px;margin-bottom:10px;">📍</div>
        <p>Você ainda não possui nenhum endereço cadastrado.</p>
        <button class="btn-add" type="button" onclick="abrirModalNovoEndereco()">
          + Cadastrar primeiro endereço
        </button>
      </div>
    `
    atualizarBarraInferior()
    return
  }

  container.innerHTML = enderecosLista.map((end, idx) => {
    const isSelected = enderecoSelecionado && String(enderecoSelecionado.id) === String(end.id)
    const cepFormatado = formatarCep(end.cep || '')
    const origemLabel = end._origem === 'supabase' ? 'Salvo na conta' : 'Salvo no navegador'

    return `
      <div class="endereco-card ${isSelected ? 'selected' : ''}" onclick="selecionarEnderecoPorIndice(${idx})">
        <div class="endereco-card-left">
          <div class="radio-circle">
            <div class="radio-dot"></div>
          </div>
          <div class="endereco-info">
            <div class="endereco-titulo-row">
              <span class="endereco-rua">${escaparHtml(end.logradouro)}, ${escaparHtml(end.numero)}</span>
              ${isSelected ? '<span class="badge-selecionado">Selecionado para entrega</span>' : ''}
              <span class="badge-origem">${origemLabel}</span>
            </div>
            <div class="endereco-detalhes">
              ${end.complemento ? `${escaparHtml(end.complemento)} · ` : ''}${escaparHtml(end.bairro)} — ${escaparHtml(end.cidade)}/${escaparHtml((end.estado || '').trim())}
            </div>
            <div class="endereco-cep">CEP: ${escaparHtml(cepFormatado)}</div>
          </div>
        </div>
        <div class="endereco-acoes" onclick="event.stopPropagation()">
          <button class="btn-icon" type="button" title="Editar endereço" onclick="abrirModalEditarEndereco(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar
          </button>
          <button class="btn-icon danger" type="button" title="Remover endereço" onclick="removerEndereco(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
          </button>
        </div>
      </div>
    `
  }).join('')

  atualizarBarraInferior()
}

function atualizarBarraInferior() {
  const resumoEl = document.getElementById('resumoEnderecoSelecionado')
  const btnIrPag = document.getElementById('btnIrPagamento')

  if (enderecoSelecionado) {
    const comp = enderecoSelecionado.complemento ? ` (${enderecoSelecionado.complemento})` : ''
    resumoEl.textContent = `${enderecoSelecionado.logradouro}, ${enderecoSelecionado.numero}${comp} — ${enderecoSelecionado.bairro}, ${enderecoSelecionado.cidade}/${(enderecoSelecionado.estado || '').trim()}`
    btnIrPag.disabled = false
  } else {
    resumoEl.textContent = 'Selecione ou cadastre um endereço acima para continuar'
    btnIrPag.disabled = true
  }
}

window.selecionarEnderecoPorIndice = (idx) => {
  const escolhido = enderecosLista[idx]
  if (!escolhido) return
  definirEnderecoSelecionado(escolhido)
  renderizarEnderecos()
  showToast('Endereço selecionado para entrega!')
}

// ════════════════════════════════════════════════════════════════
//  VALIDAÇÃO DOS CAMPOS OBRIGATÓRIOS (REQ. 11)
// ════════════════════════════════════════════════════════════════
function limparErrosInputs() {
  ;['endCep', 'endLogradouro', 'endNumero', 'endBairro', 'endCidade', 'endEstado'].forEach(id => {
    document.getElementById(id).classList.remove('input-error')
  })
}

function validarCamposEndereco({ cep, logradouro, numero, bairro, cidade, estado }) {
  limparErrosInputs()

  const cepNumeros = cep.replace(/\D/g, '')
  if (!cepNumeros) {
    document.getElementById('endCep').classList.add('input-error')
    document.getElementById('endCep').focus()
    return { valido: false, mensagem: 'O campo CEP é obrigatório.' }
  }
  if (cepNumeros.length !== 8) {
    document.getElementById('endCep').classList.add('input-error')
    document.getElementById('endCep').focus()
    return { valido: false, mensagem: 'Informe um CEP válido com 8 dígitos (ex: 14700-000).' }
  }

  if (!logradouro || logradouro.length < 3) {
    document.getElementById('endLogradouro').classList.add('input-error')
    document.getElementById('endLogradouro').focus()
    return { valido: false, mensagem: 'Informe a Rua / Logradouro (mínimo 3 caracteres).' }
  }

  if (!numero) {
    document.getElementById('endNumero').classList.add('input-error')
    document.getElementById('endNumero').focus()
    return { valido: false, mensagem: 'Informe o número do endereço (ou "S/N").' }
  }

  if (!bairro || bairro.length < 2) {
    document.getElementById('endBairro').classList.add('input-error')
    document.getElementById('endBairro').focus()
    return { valido: false, mensagem: 'Informe o bairro para entrega.' }
  }

  if (!cidade || cidade.length < 2) {
    document.getElementById('endCidade').classList.add('input-error')
    document.getElementById('endCidade').focus()
    return { valido: false, mensagem: 'Informe a cidade.' }
  }

  if (!estado || estado.trim().length !== 2) {
    document.getElementById('endEstado').classList.add('input-error')
    document.getElementById('endEstado').focus()
    return { valido: false, mensagem: 'Selecione o Estado (UF).' }
  }

  if (!clienteId && chkConsentimento && !chkConsentimento.checked) {
    return {
      valido: false,
      mensagem: 'Marque a opção "Permitir salvar no navegador" (consentimento de cookies) ou faça login para salvar seu endereço.'
    }
  }

  return { valido: true }
}

// ════════════════════════════════════════════════════════════════
//  POST /endereço/add  &  PUT /endereço/edit
// ════════════════════════════════════════════════════════════════
const modalEndereco = document.getElementById('modalEndereco')

window.abrirModalNovoEndereco = () => {
  hideAlertEndereco()
  limparErrosInputs()
  document.getElementById('endId').value          = ''
  document.getElementById('endOrigem').value      = clienteId ? 'supabase' : 'local'
  document.getElementById('endCep').value         = ''
  document.getElementById('endLogradouro').value  = ''
  document.getElementById('endNumero').value      = ''
  document.getElementById('endComplemento').value = ''
  document.getElementById('endBairro').value      = ''
  document.getElementById('endCidade').value      = 'Bebedouro'
  document.getElementById('endEstado').value      = 'SP'

  document.getElementById('modalEnderecoTitulo').innerHTML = 'Novo <span>Endereço</span>'
  document.getElementById('modalEnderecoSub').textContent  = 'Preencha os campos obrigatórios (*) para cadastrar o local de entrega.'
  modalEndereco.classList.add('open')
}

window.abrirModalEditarEndereco = (idx) => {
  const end = enderecosLista[idx]
  if (!end) return

  hideAlertEndereco()
  limparErrosInputs()
  document.getElementById('endId').value          = end.id
  document.getElementById('endOrigem').value      = end._origem || (clienteId ? 'supabase' : 'local')
  document.getElementById('endCep').value         = formatarCep(end.cep || '')
  document.getElementById('endLogradouro').value  = end.logradouro || ''
  document.getElementById('endNumero').value      = end.numero || ''
  document.getElementById('endComplemento').value = end.complemento || ''
  document.getElementById('endBairro').value      = end.bairro || ''
  document.getElementById('endCidade').value      = end.cidade || ''
  document.getElementById('endEstado').value      = (end.estado || 'SP').trim().toUpperCase()

  document.getElementById('modalEnderecoTitulo').innerHTML = 'Editar <span>Endereço</span>'
  document.getElementById('modalEnderecoSub').textContent  = 'Atualize os dados do endereço selecionado.'
  modalEndereco.classList.add('open')
}

document.getElementById('btnNovoEndereco').addEventListener('click', () => window.abrirModalNovoEndereco())
document.getElementById('fecharModalEndereco').addEventListener('click', () => modalEndereco.classList.remove('open'))
document.getElementById('cancelarEndereco').addEventListener('click', () => modalEndereco.classList.remove('open'))

modalEndereco.addEventListener('click', e => {
  if (e.target === modalEndereco) modalEndereco.classList.remove('open')
})

async function persistirNoSupabase(id, payload, isEdit) {
  const tentar = async (cepValor) => {
    const dados = { ...payload, cep: cepValor }
    if (isEdit) {
      return await supabase.from('endereco').update(dados).eq('id', Number(id)).select().single()
    } else {
      return await supabase.from('endereco').insert(dados).select().single()
    }
  }

  const cepDigitos = payload.cep.replace(/\D/g, '')
  let res = await tentar(cepDigitos)
  if (res.error) {
    res = await tentar(formatarCep(cepDigitos))
  }
  return res
}

document.getElementById('salvarEndereco').addEventListener('click', async () => {
  hideAlertEndereco()

  const id          = document.getElementById('endId').value.trim()
  const origem      = document.getElementById('endOrigem').value
  const cep         = document.getElementById('endCep').value.trim()
  const logradouro  = document.getElementById('endLogradouro').value.trim()
  const numero      = document.getElementById('endNumero').value.trim()
  const complemento = document.getElementById('endComplemento').value.trim()
  const bairro      = document.getElementById('endBairro').value.trim()
  const cidade      = document.getElementById('endCidade').value.trim()
  const estado      = document.getElementById('endEstado').value.trim().toUpperCase()

  const validacao = validarCamposEndereco({ cep, logradouro, numero, bairro, cidade, estado })
  if (!validacao.valido) {
    showAlertEndereco(validacao.mensagem)
    return
  }

  const btn = document.getElementById('salvarEndereco')
  btn.classList.add('loading')
  btn.textContent = 'Salvando…'

  const payload = {
    logradouro,
    numero,
    complemento: complemento || null,
    bairro,
    cidade,
    estado,
    cep: cep.replace(/\D/g, '')
  }

  try {
    if (clienteId && origem === 'supabase') {
      payload.cliente_id = Number(clienteId)

      // PUT /endereço/edit  ou  POST /endereço/add
      const { data, error } = await persistirNoSupabase(id, payload, Boolean(id))

      if (error) {
        btn.classList.remove('loading')
        btn.textContent = 'Salvar endereço'
        showAlertEndereco('Erro ao salvar no banco: ' + error.message)
        return
      }

      const registroSalvo = { ...(data || { ...payload, id: id || Date.now() }), _origem: 'supabase' }
      definirEnderecoSelecionado(registroSalvo)
      modalEndereco.classList.remove('open')
      showToast(id ? 'Endereço atualizado com sucesso!' : 'Endereço cadastrado com sucesso!')
      await carregarEnderecos()
    } else {
      salvarCookieConsentimento(true)
      const locais = getEnderecosLocais()

      if (id) {
        // PUT /endereço/edit (LocalStorage)
        const idx = locais.findIndex(e => String(e.id) === String(id))
        const atualizado = { ...payload, id, _origem: 'local' }
        if (idx >= 0) {
          locais[idx] = atualizado
        } else {
          locais.unshift(atualizado)
        }
        salvarEnderecosLocais(locais)
        definirEnderecoSelecionado(atualizado)
        showToast('Endereço atualizado no navegador!')
      } else {
        // POST /endereço/add (LocalStorage)
        const novoLocal = {
          ...payload,
          id: 'local_' + Date.now(),
          _origem: 'local'
        }
        locais.unshift(novoLocal)
        salvarEnderecosLocais(locais)
        definirEnderecoSelecionado(novoLocal)
        showToast('Endereço salvo no navegador!')
      }

      modalEndereco.classList.remove('open')
      await carregarEnderecos()
    }
  } finally {
    btn.classList.remove('loading')
    btn.textContent = 'Salvar endereço'
  }
})

// ── Remover Endereço ──
window.removerEndereco = async (idx) => {
  const end = enderecosLista[idx]
  if (!end) return

  if (end._origem === 'supabase' && clienteId) {
    const { error } = await supabase.from('endereco').delete().eq('id', Number(end.id))
    if (error) {
      showToast('Não foi possível excluir este endereço (pode estar vinculado a um pedido).', 'error')
      return
    }
  } else {
    const locais = getEnderecosLocais().filter(e => String(e.id) !== String(end.id))
    salvarEnderecosLocais(locais)
  }

  if (enderecoSelecionado && String(enderecoSelecionado.id) === String(end.id)) {
    definirEnderecoSelecionado(null)
  }

  showToast('Endereço removido.')
  await carregarEnderecos()
}

// ════════════════════════════════════════════════════════════════
//  MÁSCARA DE CEP E CONSULTA AUTOMÁTICA (ViaCEP)
// ════════════════════════════════════════════════════════════════
function formatarCep(valor) {
  const v = String(valor).replace(/\D/g, '').slice(0, 8)
  if (v.length > 5) return v.replace(/(\d{5})(\d{1,3})/, '$1-$2')
  return v
}

const inputCep = document.getElementById('endCep')
inputCep.addEventListener('input', e => {
  e.target.value = formatarCep(e.target.value)
  e.target.classList.remove('input-error')
  if (e.target.value.replace(/\D/g, '').length === 8) {
    consultarViaCep(e.target.value)
  }
})

document.getElementById('btnBuscarCep').addEventListener('click', () => {
  consultarViaCep(inputCep.value)
})

async function consultarViaCep(cepRaw) {
  const cepLimpo = cepRaw.replace(/\D/g, '')
  if (cepLimpo.length !== 8) {
    showAlertEndereco('Digite os 8 números do CEP para buscar automaticamente.')
    return
  }

  hideAlertEndereco()
  const btnCep = document.getElementById('btnBuscarCep')
  const textoOriginal = btnCep.textContent
  btnCep.textContent = 'Buscando…'

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`)
    const dados = await resp.json()
    if (dados.erro) {
      showToast('CEP não encontrado. Preencha os campos manualmente.', 'error')
    } else {
      if (dados.logradouro) document.getElementById('endLogradouro').value = dados.logradouro
      if (dados.bairro)     document.getElementById('endBairro').value     = dados.bairro
      if (dados.localidade) document.getElementById('endCidade').value     = dados.localidade
      if (dados.uf)         document.getElementById('endEstado').value     = dados.uf
      document.getElementById('endNumero').focus()
      showToast('Endereço preenchido pelo CEP!')
    }
  } catch {
    // Preenchimento manual caso offline
  } finally {
    btnCep.textContent = textoOriginal
  }
}

;['endLogradouro', 'endNumero', 'endBairro', 'endCidade', 'endEstado'].forEach(id => {
  document.getElementById(id).addEventListener('input', e => e.target.classList.remove('input-error'))
})

function escaparHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ════════════════════════════════════════════════════════════════
//  CONTINUAR PARA SELEÇÃO DE PAGAMENTO
// ════════════════════════════════════════════════════════════════
document.getElementById('btnIrPagamento').addEventListener('click', () => {
  if (!enderecoSelecionado) {
    showToast('Selecione ou cadastre um endereço de entrega primeiro.', 'error')
    return
  }
  window.location.href = 'pagamento.html'
})

// ── Inicialização ──
carregarEnderecos()
