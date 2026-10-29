import { supabase } from './supabase.js'

const STORAGE_AUDIT_KEY = 'bs_logs_auditoria'

// Obtém dados do administrador logado
export async function obterAdminAtual() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (session && session.user) {
      return session.user.user_metadata?.nome || session.user.email || 'Administrador'
    }
  } catch {
    // fallback
  }
  return 'Administrador'
}

// Registra um evento nos Logs de Auditoria (Supabase + LocalStorage)
export async function registrarLogAuditoria({ acao, modulo, referencia, detalhes }) {
  const adminNome = await obterAdminAtual()
  const novoLog = {
    id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    data_hora: new Date().toISOString(),
    usuario: adminNome,
    acao: acao || 'Alteração',
    modulo: modulo || 'Sistema',
    referencia: referencia ? String(referencia) : '—',
    detalhes: detalhes || ''
  }

  // Salva localmente para disponibilidade imediata
  try {
    const atuais = JSON.parse(localStorage.getItem(STORAGE_AUDIT_KEY) || '[]')
    atuais.unshift(novoLog)
    localStorage.setItem(STORAGE_AUDIT_KEY, JSON.stringify(atuais.slice(0, 300)))
  } catch {
    // ignora erro de quota
  }

  // Tenta salvar também no Supabase caso exista tabela log_auditoria
  try {
    await supabase.from('log_auditoria').insert({
      usuario: novoLog.usuario,
      acao: novoLog.acao,
      modulo: novoLog.modulo,
      referencia: novoLog.referencia,
      detalhes: novoLog.detalhes,
      criado_em: novoLog.data_hora
    })
  } catch {
    // tabela opcional
  }

  return novoLog
}

export function obterLogsAuditoriaLocais() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_AUDIT_KEY) || '[]')
  } catch {
    return []
  }
}

// Helpers para separar e formatar Método de Pagamento e Status do Pagamento na coluna forma_pagamento
export function extrairInfoPagamento(pedido) {
  const bruto = String(pedido?.forma_pagamento || 'Não informado').trim()
  if (pedido?.status_pagamento) {
    return {
      metodo: bruto.split(' | ')[0].trim(),
      statusPagamento: pedido.status_pagamento
    }
  }

  const partes = bruto.split(' | ')
  if (partes.length >= 2) {
    const ultimo = partes[partes.length - 1].trim()
    if (
      ultimo.toLowerCase() === 'pagamento realizado' ||
      ultimo.toLowerCase() === 'aguardando pagamento'
    ) {
      return {
        metodo: partes.slice(0, -1).join(' | ').trim(),
        statusPagamento: ultimo === 'pagamento realizado' ? 'Pagamento realizado' : ultimo
      }
    }
  }

  return {
    metodo: bruto,
    statusPagamento: 'Aguardando pagamento'
  }
}

export function montarFormaPagamentoComStatus(metodoBase, statusPagamento) {
  const limpo = String(metodoBase || 'PIX').split(' | ')[0].trim()
  const st = statusPagamento === 'Pagamento realizado' ? 'Pagamento realizado' : 'Aguardando pagamento'
  return `${limpo} | ${st}`
}
