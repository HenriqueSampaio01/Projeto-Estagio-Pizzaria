import { supabase } from './supabase.js'

// ════════════════════════════════
//  CARRINHO — localStorage
// ════════════════════════════════
function getCarrinho() {
  return JSON.parse(localStorage.getItem('bs_carrinho') || '[]')
}
function salvarCarrinho(carrinho) {
  localStorage.setItem('bs_carrinho', JSON.stringify(carrinho))
  atualizarCartBar()
}
function atualizarCartBar() {
  const carrinho = getCarrinho()
  const total = carrinho.reduce((s, i) => s + i.preco * i.qty, 0)
  const qtd   = carrinho.reduce((s, i) => s + i.qty, 0)
  const bar   = document.getElementById('cartBar')
  if (qtd > 0) {
    bar.style.display = 'flex'
    document.getElementById('cartCount').textContent = `${qtd} ${qtd === 1 ? 'item' : 'itens'}`
    document.getElementById('cartTotal').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`
  } else {
    bar.style.display = 'none'
  }
}

// ════════════════════════════════
//  NAVBAR — estado logado/deslogado
// ════════════════════════════════
const clienteNome = sessionStorage.getItem('cliente_nome')
const navActions  = document.getElementById('navActions')

if (clienteNome) {
  navActions.innerHTML = `
    <span class="nav-user">Olá, <strong>${clienteNome}</strong></span>
    <button class="btn-nav-ghost" id="btnLogoutCliente">Sair</button>
  `
  document.getElementById('btnLogoutCliente').addEventListener('click', () => {
    sessionStorage.removeItem('cliente_id')
    sessionStorage.removeItem('cliente_nome')
    window.location.reload()
  })
} else {
  document.getElementById('btnAbrirLogin').addEventListener('click',    () => abrirModal(modalLogin))
  document.getElementById('btnAbrirCadastro').addEventListener('click', () => abrirModal(modalCadastro))
}

// ════════════════════════════════
//  EASTER EGG
// ════════════════════════════════
const easterEgg = document.getElementById('easterEgg')
let clicks = 0, timer = null

easterEgg.addEventListener('click', () => {
  clicks++
  easterEgg.classList.add('ativando')
  clearTimeout(timer)
  timer = setTimeout(() => { clicks = 0; easterEgg.classList.remove('ativando') }, 2000)
  if (clicks >= 5) {
    easterEgg.classList.remove('ativando')
    easterEgg.classList.add('ativado')
    easterEgg.textContent = '🔐 Redirecionando…'
    setTimeout(() => { window.location.href = '../adm/loginAdm.html' }, 800)
  }
})

// ════════════════════════════════
//  SCROLL hero
// ════════════════════════════════
document.getElementById('btnHeroPedir').addEventListener('click', () => {
  document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })
})

// ════════════════════════════════
//  MODAIS
// ════════════════════════════════
const modalLogin    = document.getElementById('modalLogin')
const modalCadastro = document.getElementById('modalCadastro')
const modalProduto  = document.getElementById('modalProduto')

function abrirModal(m) { m.classList.add('open') }
function fecharModal(m) { m.classList.remove('open') }

document.getElementById('fecharLogin').addEventListener('click',        () => fecharModal(modalLogin))
document.getElementById('fecharCadastro').addEventListener('click',     () => fecharModal(modalCadastro))
document.getElementById('fecharModalProduto').addEventListener('click', () => fecharModal(modalProduto))

document.getElementById('irParaCadastro').addEventListener('click', e => {
  e.preventDefault(); fecharModal(modalLogin); abrirModal(modalCadastro)
})
document.getElementById('irParaLogin').addEventListener('click', e => {
  e.preventDefault(); fecharModal(modalCadastro); abrirModal(modalLogin)
})

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) fecharModal(o) })
})

// ════════════════════════════════
//  ALERTAS
// ════════════════════════════════
function showAlert(id, idText, msg) {
  document.getElementById(idText).textContent = msg
  document.getElementById(id).classList.add('visible')
}
function hideAlert(id) { document.getElementById(id).classList.remove('visible') }

// ════════════════════════════════
//  TOGGLE SENHA
// ════════════════════════════════
function setupToggle(btnId, inputId, eyeId) {
  document.getElementById(btnId).addEventListener('click', () => {
    const input = document.getElementById(inputId)
    const eye   = document.getElementById(eyeId)
    const isPass = input.type === 'password'
    input.type = isPass ? 'text' : 'password'
    eye.innerHTML = isPass
      ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
      : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
  })
}
setupToggle('toggleLoginSenha', 'loginSenha', 'eyeLogin')
setupToggle('toggleCadSenha',   'cadSenha',   'eyeCad')

// ════════════════════════════════
//  MÁSCARAS
// ════════════════════════════════
document.getElementById('cadCpf').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 9)      v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
  else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
  else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
  e.target.value = v
})
document.getElementById('cadTelefone').addEventListener('input', e => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 11)
  if (v.length > 6)      v = v.replace(/(\d{2})(\d{5})(\d{1,4})/, '($1) $2-$3')
  else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,5})/, '($1) $2')
  e.target.value = v
})

// ════════════════════════════════
//  LOGIN CLIENTE
// ════════════════════════════════
async function doLogin() {
  hideAlert('alertLogin')
  const email = document.getElementById('loginEmail').value.trim()
  const senha = document.getElementById('loginSenha').value
  if (!email || !senha) { showAlert('alertLogin', 'alertLoginText', 'Preencha e-mail e senha.'); return }

  const btn = document.getElementById('btnLogin')
  btn.textContent = 'Entrando…'; btn.classList.add('loading')

  const { data, error } = await supabase
    .from('cliente').select('id, nome, ativo')
    .eq('email', email).eq('senha', senha).single()

  btn.textContent = 'Entrar'; btn.classList.remove('loading')

  if (error || !data) { showAlert('alertLogin', 'alertLoginText', 'E-mail ou senha incorretos.'); return }
  if (!data.ativo)    { showAlert('alertLogin', 'alertLoginText', 'Conta inativa. Entre em contato.'); return }

  sessionStorage.setItem('cliente_id',   data.id)
  sessionStorage.setItem('cliente_nome', data.nome)
  window.location.reload()
}

document.getElementById('btnLogin').addEventListener('click', doLogin)
document.getElementById('loginSenha').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin() })

// ════════════════════════════════
//  CADASTRO CLIENTE
// ════════════════════════════════
document.getElementById('btnCadastrar').addEventListener('click', async () => {
  hideAlert('alertCadastro')
  const nome     = document.getElementById('cadNome').value.trim()
  const cpf      = document.getElementById('cadCpf').value.trim()
  const email    = document.getElementById('cadEmail').value.trim()
  const telefone = document.getElementById('cadTelefone').value.trim()
  const senha    = document.getElementById('cadSenha').value

  if (!nome)  { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu nome.'); return }
  if (!cpf)   { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu CPF.'); return }
  if (!email) { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu e-mail.'); return }
  if (!senha || senha.length < 6) { showAlert('alertCadastro', 'alertCadastroText', 'Senha mínimo 6 caracteres.'); return }

  const btn = document.getElementById('btnCadastrar')
  btn.textContent = 'Criando conta…'; btn.classList.add('loading')

  const { data: existente } = await supabase.from('cliente').select('id').eq('email', email).single()
  if (existente) {
    btn.textContent = 'Criar conta'; btn.classList.remove('loading')
    showAlert('alertCadastro', 'alertCadastroText', 'Este e-mail já está cadastrado.')
    return
  }

  const { error } = await supabase.from('cliente')
    .insert({ nome, cpf, email, telefone: telefone || null, senha, ativo: true })

  btn.textContent = 'Criar conta'; btn.classList.remove('loading')
  if (error) { showAlert('alertCadastro', 'alertCadastroText', error.message); return }

  document.getElementById('formCadastro').style.display = 'none'
  document.getElementById('successCadastro').classList.add('visible')
  setTimeout(() => {
    fecharModal(modalCadastro)
    document.getElementById('formCadastro').style.display = 'block'
    document.getElementById('successCadastro').classList.remove('visible')
    abrirModal(modalLogin)
  }, 2500)
})

// ════════════════════════════════
//  GET /produtos/list — CARDÁPIO
// ════════════════════════════════
let todosProdutos = []

async function carregarCardapio() {
  const { data: categorias, error: errCat } = await supabase
    .from('categoria').select('id, nome').eq('ativo', true).order('nome')
  const { data: produtos,   error: errProd } = await supabase
    .from('produto').select('id, nome, preco, ingredientes, categoria_id').eq('ativo', true).order('nome')

  if (errCat || errProd) {
    document.getElementById('cardapioConteudo').innerHTML =
      '<div class="loading-state">Erro ao carregar cardápio.</div>'
    return
  }

  todosProdutos = produtos || []
  const cats    = categorias || []

  const container = document.getElementById('cardapioConteudo')

  if (!todosProdutos.length) {
    container.innerHTML = '<div class="loading-state">Nenhum produto disponível no momento.</div>'
    return
  }

  container.innerHTML = cats.map(cat => {
    const prods = todosProdutos.filter(p => p.categoria_id === cat.id)
    if (!prods.length) return ''
    return `
      <div class="categoria-section">
        <div class="categoria-titulo">${cat.nome}</div>
        <div class="produtos-grid">
          ${prods.map(p => `
            <div class="produto-card" onclick="abrirProduto(${JSON.stringify(p).replace(/"/g,'&quot;')})">
              <div class="produto-nome">${p.nome}</div>
              ${p.ingredientes ? `<div class="produto-ingredientes">${p.ingredientes}</div>` : ''}
              <div class="produto-footer">
                <div class="produto-preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</div>
                <button class="btn-add-cart">+ Adicionar</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }).join('')
}

// ════════════════════════════════
//  BUSCA RÁPIDA
// ════════════════════════════════
const navSearch    = document.getElementById('navSearch')
const dropdown     = document.getElementById('searchDropdown')

navSearch.addEventListener('input', () => {
  const q = navSearch.value.trim().toLowerCase()
  if (!q) { dropdown.classList.remove('open'); return }

  const resultados = todosProdutos.filter(p => p.nome.toLowerCase().includes(q)).slice(0, 6)

  if (!resultados.length) {
    dropdown.innerHTML = '<div class="search-empty">Nenhum produto encontrado.</div>'
  } else {
    dropdown.innerHTML = resultados.map(p => `
      <div class="search-item" onclick="abrirProduto(${JSON.stringify(p).replace(/"/g,'&quot;')})">
        <div>
          <div class="search-item-nome">${p.nome}</div>
        </div>
        <div class="search-item-preco">R$ ${Number(p.preco).toFixed(2).replace('.', ',')}</div>
      </div>
    `).join('')
  }
  dropdown.classList.add('open')
})

document.addEventListener('click', e => {
  if (!navSearch.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.remove('open')
  }
})

// ════════════════════════════════
//  MODAL ADICIONAR AO CARRINHO
// ════════════════════════════════
let produtoAtual = null
let qtyAtual = 1

window.abrirProduto = (p) => {
  produtoAtual = p
  qtyAtual = 1
  document.getElementById('modalProdutoNome').textContent  = p.nome
  document.getElementById('modalProdutoPreco').textContent = `R$ ${Number(p.preco).toFixed(2).replace('.', ',')}`
  document.getElementById('modalProdutoDesc').textContent  = p.ingredientes ?? ''
  document.getElementById('modalObs').value = ''
  document.getElementById('qtyVal').textContent = '1'
  abrirModal(modalProduto)
}

document.getElementById('qtyMinus').addEventListener('click', () => {
  if (qtyAtual > 1) { qtyAtual--; document.getElementById('qtyVal').textContent = qtyAtual }
})
document.getElementById('qtyPlus').addEventListener('click', () => {
  qtyAtual++; document.getElementById('qtyVal').textContent = qtyAtual
})

document.getElementById('btnAdicionarCarrinho').addEventListener('click', () => {
  if (!produtoAtual) return
  const carrinho = getCarrinho()
  carrinho.push({
    id:    produtoAtual.id,
    nome:  produtoAtual.nome,
    preco: produtoAtual.preco,
    qty:   qtyAtual,
    obs:   document.getElementById('modalObs').value.trim()
  })
  salvarCarrinho(carrinho)
  fecharModal(modalProduto)
})

// ════════════════════════════════
//  INIT
// ════════════════════════════════
atualizarCartBar()
carregarCardapio()