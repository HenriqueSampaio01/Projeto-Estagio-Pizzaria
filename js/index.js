import { supabase } from './supabase.js'

// ════════════════════════════════
//  NAVBAR — estado logado/deslogado
// ════════════════════════════════
const clienteNome = sessionStorage.getItem('cliente_nome')
const navActions  = document.querySelector('.nav-actions')

if (clienteNome) {
  // Cliente logado — troca botões pelo nome e logout
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
  // Não logado — botões normais já estão no HTML
  document.getElementById('btnAbrirLogin').addEventListener('click',   () => abrirModal(modalLogin))
  document.getElementById('btnAbrirCadastro').addEventListener('click', () => abrirModal(modalCadastro))
}

// ════════════════════════════════
//  EASTER EGG — rodapé → admin
// ════════════════════════════════
const easterEgg = document.getElementById('easterEgg')
let clicks = 0
let timer = null

easterEgg.addEventListener('click', () => {
  clicks++
  easterEgg.classList.add('ativando')

  clearTimeout(timer)
  timer = setTimeout(() => {
    clicks = 0
    easterEgg.classList.remove('ativando')
  }, 2000)

  if (clicks >= 5) {
    easterEgg.classList.remove('ativando')
    easterEgg.classList.add('ativado')
    easterEgg.textContent = '🔐 Redirecionando…'
    setTimeout(() => {
      window.location.href = '../adm/loginAdm.html'
    }, 800)
  }
})

// ════════════════════════════════
//  SCROLL para o cardápio
// ════════════════════════════════
document.getElementById('btnHeroPedir').addEventListener('click', () => {
  document.getElementById('cardapio').scrollIntoView({ behavior: 'smooth' })
})

// ════════════════════════════════
//  ABRIR MODAIS
// ════════════════════════════════
const modalLogin   = document.getElementById('modalLogin')
const modalCadastro = document.getElementById('modalCadastro')

document.getElementById('fecharLogin').addEventListener('click',   () => fecharModal(modalLogin))
document.getElementById('fecharCadastro').addEventListener('click', () => fecharModal(modalCadastro))

document.getElementById('irParaCadastro').addEventListener('click', e => {
  e.preventDefault()
  fecharModal(modalLogin)
  abrirModal(modalCadastro)
})

document.getElementById('irParaLogin').addEventListener('click', e => {
  e.preventDefault()
  fecharModal(modalCadastro)
  abrirModal(modalLogin)
})

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) fecharModal(overlay)
  })
})

function abrirModal(modal) { modal.classList.add('open') }
function fecharModal(modal) { modal.classList.remove('open') }

// ════════════════════════════════
//  ALERTAS
// ════════════════════════════════
function showAlert(idAlert, idText, msg) {
  document.getElementById(idText).textContent = msg
  document.getElementById(idAlert).classList.add('visible')
}
function hideAlert(idAlert) {
  document.getElementById(idAlert).classList.remove('visible')
}

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

  if (!email || !senha) {
    showAlert('alertLogin', 'alertLoginText', 'Preencha e-mail e senha.')
    return
  }

  const btn = document.getElementById('btnLogin')
  btn.textContent = 'Entrando…'; btn.classList.add('loading')

  // Busca cliente por email e senha
  // TODO: aplicar hash na comparação quando o backend estiver pronto
  const { data, error } = await supabase
    .from('cliente')
    .select('id, nome, ativo')
    .eq('email', email)
    .eq('senha', senha)
    .single()

  btn.textContent = 'Entrar'; btn.classList.remove('loading')

  if (error || !data) {
    showAlert('alertLogin', 'alertLoginText', 'E-mail ou senha incorretos.')
    return
  }

  if (!data.ativo) {
    showAlert('alertLogin', 'alertLoginText', 'Sua conta está inativa. Entre em contato.')
    return
  }

  // Salva sessão simples do cliente e redireciona
  sessionStorage.setItem('cliente_id',   data.id)
  sessionStorage.setItem('cliente_nome', data.nome)
  window.location.href = 'index.html' // TODO: trocar pela página de pedidos quando pronta
}

document.getElementById('btnLogin').addEventListener('click', doLogin)
document.getElementById('loginSenha').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin()
})

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

  if (!nome)              { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu nome.'); return }
  if (!cpf)               { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu CPF.'); return }
  if (!email)             { showAlert('alertCadastro', 'alertCadastroText', 'Informe seu e-mail.'); return }
  if (!senha || senha.length < 6) { showAlert('alertCadastro', 'alertCadastroText', 'A senha deve ter no mínimo 6 caracteres.'); return }

  const btn = document.getElementById('btnCadastrar')
  btn.textContent = 'Criando conta…'; btn.classList.add('loading')

  // Verifica se e-mail já existe
  const { data: existente } = await supabase
    .from('cliente')
    .select('id')
    .eq('email', email)
    .single()

  if (existente) {
    btn.textContent = 'Criar conta'; btn.classList.remove('loading')
    showAlert('alertCadastro', 'alertCadastroText', 'Este e-mail já está cadastrado.')
    return
  }

  // POST /usuario/add
  // TODO: aplicar hash na senha antes do insert quando o backend estiver pronto
  const { error } = await supabase
    .from('cliente')
    .insert({ nome, cpf, email, telefone: telefone || null, senha, ativo: true })

  btn.textContent = 'Criar conta'; btn.classList.remove('loading')

  if (error) {
    showAlert('alertCadastro', 'alertCadastroText', error.message)
    return
  }

  // Exibe sucesso e esconde o formulário
  document.getElementById('formCadastro').style.display = 'none'
  document.getElementById('successCadastro').classList.add('visible')

  // Após 2.5s oferece ir para o login
  setTimeout(() => {
    fecharModal(modalCadastro)
    document.getElementById('formCadastro').style.display = 'block'
    document.getElementById('successCadastro').classList.remove('visible')
    abrirModal(modalLogin)
  }, 2500)
})