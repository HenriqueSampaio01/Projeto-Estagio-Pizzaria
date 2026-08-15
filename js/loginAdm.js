// ── Credenciais de demonstração ──
// TODO: substituir pela chamada real à API/banco quando integrar o backend
const DEMO_USERS = [
  { email: 'admin@backstock.com',       senha: '123456', nome: 'Administrador' },
  { email: 'funcionario@backstock.com', senha: '123456', nome: 'Funcionário'   },
];

const btnLogin   = document.getElementById('btnLogin');
const togglePass = document.getElementById('togglePass');
const senhaInput = document.getElementById('senha');
const emailInput = document.getElementById('email');
const alertMsg   = document.getElementById('alertMsg');
const alertText  = document.getElementById('alertText');
const eyeIcon    = document.getElementById('eyeIcon');

// ── Toggle mostrar/ocultar senha ──
togglePass.addEventListener('click', () => {
  const isPass = senhaInput.type === 'password';
  senhaInput.type = isPass ? 'text' : 'password';
  eyeIcon.innerHTML = isPass
    ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
    : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>';
});

// ── Submit por tecla Enter ──
[emailInput, senhaInput].forEach(el => {
  el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
});

btnLogin.addEventListener('click', doLogin);

function showAlert(msg) {
  alertText.textContent = msg;
  alertMsg.classList.add('visible');
}
function hideAlert() {
  alertMsg.classList.remove('visible');
}

function doLogin() {
  hideAlert();
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    showAlert('Preencha o e-mail e a senha para continuar.');
    return;
  }

  btnLogin.textContent = 'Entrando…';
  btnLogin.classList.add('loading');

  // TODO: trocar o setTimeout + DEMO_USERS pela fetch() real ao backend
  setTimeout(() => {
    const user = DEMO_USERS.find(u => u.email === email && u.senha === senha);

    if (user) {
      // Passa o nome via query string — funciona mesmo em file://
      window.location.href = 'dashboard.html?nome=' + encodeURIComponent(user.nome);
    } else {
      showAlert('E-mail ou senha incorretos. Tente novamente.');
      senhaInput.value = '';
      senhaInput.focus();
      btnLogin.textContent = 'Entrar';
      btnLogin.classList.remove('loading');
    }
  }, 800);
}