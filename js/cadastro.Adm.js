import { supabase } from './supabase.js'

const btnCadastrar    = document.getElementById('btnCadastrar')
const nomeInput       = document.getElementById('nome')
const sobrenomeInput  = document.getElementById('sobrenome')
const emailInput      = document.getElementById('email')
const senhaInput      = document.getElementById('senha')
const confirmarInput  = document.getElementById('confirmarSenha')
const alertMsg        = document.getElementById('alertMsg')
const alertText       = document.getElementById('alertText')
const successBox      = document.getElementById('successBox')
const successText     = document.getElementById('successText')
const formFields      = document.getElementById('formFields')

// Toggle mostrar/ocultar senha
function togglePass(inputEl, eyeEl) {
  const isPass = inputEl.type === 'password'
  inputEl.type = isPass ? 'text' : 'password'
  eyeEl.innerHTML = isPass
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
}

document.getElementById('toggleSenha').addEventListener('click', () =>
  togglePass(senhaInput, document.getElementById('eyeSenha'))
)
document.getElementById('toggleConfirmar').addEventListener('click', () =>
  togglePass(confirmarInput, document.getElementById('eyeConfirmar'))
)

// enviar pela tecla Enter
;[nomeInput, sobrenomeInput, emailInput, senhaInput, confirmarInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doCadastro() })
})

btnCadastrar.addEventListener('click', doCadastro)

function showAlert(msg) {
  alertText.textContent = msg
  alertMsg.classList.add('visible')
  successBox.classList.remove('visible')
}

function hideAlert() {
  alertMsg.classList.remove('visible')
}

async function doCadastro() {
  hideAlert()

  const nome      = nomeInput.value.trim()
  const sobrenome = sobrenomeInput.value.trim()
  const email     = emailInput.value.trim()
  const senha     = senhaInput.value
  const confirmar = confirmarInput.value

  // Validações
  if (!nome || !sobrenome || !email || !senha || !confirmar) {
    showAlert('Preencha todos os campos obrigatórios.')
    return
  }

  if (senha.length < 6) {
    showAlert('A senha deve ter no mínimo 6 caracteres.')
    return
  }

  if (senha !== confirmar) {
    showAlert('As senhas não coincidem. Verifique e tente novamente.')
    confirmarInput.value = ''
    confirmarInput.focus()
    return
  }

  btnCadastrar.textContent = 'Cadastrando…'
  btnCadastrar.classList.add('loading')

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      data: {
        nome: nome + ' ' + sobrenome,
      }
    }
  })

  btnCadastrar.textContent = 'Criar conta'
  btnCadastrar.classList.remove('loading')

  if (error) {
    // Traduz as mensagens mais comuns do Supabase
    if (error.message.includes('already registered')) {
      showAlert('Este e-mail já está cadastrado. Tente fazer login.')
    } else if (error.message.includes('invalid')) {
      showAlert('E-mail inválido. Verifique e tente novamente.')
    } else {
      showAlert('Erro ao cadastrar: ' + error.message)
    }
    return
  }

  // Supabase retorna identities vazio quando o e-mail já existe mas não foi confirmado
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    showAlert('Este e-mail já está cadastrado. Tente fazer login.')
    return
  }

  // Sucesso — esconde o formulário e exibe confirmação
  formFields.style.display = 'none'
  successText.innerHTML = `Cadastro de <strong>${nome}</strong> realizado!<br>Verifique seu e-mail para confirmar a conta.`
  successBox.classList.add('visible')
}