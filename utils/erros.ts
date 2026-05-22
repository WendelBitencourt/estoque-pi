/**
 * Traduz qualquer erro lançado em uma mensagem amigável em português.
 * Nunca expõe termos técnicos para a usuária.
 */
export function mensagemErro(erro: unknown, fallback?: string): string {
  const raw = erro instanceof Error ? erro.message : String(erro ?? '');
  const msg = raw.toLowerCase();

  if (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('socket') ||
    msg.includes('timeout')
  ) {
    return 'Sem internet no momento. Seus dados serão salvos quando a conexão voltar.';
  }

  if (msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
    return 'E-mail ou senha incorretos.';
  }

  if (msg.includes('auth/too-many-requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  }

  if (msg.includes('auth/') || msg.includes('401') || msg.includes('unauthorized')) {
    return 'Sua sessão expirou. Feche o app e entre novamente.';
  }

  if (msg.includes('permission') || msg.includes('403') || msg.includes('permission-denied')) {
    return 'Você não tem permissão para esta ação.';
  }

  if (msg.includes('cloudinary') || msg.includes('upload') || msg.includes('secure_url')) {
    return 'Não foi possível enviar a foto. Verifique a conexão e tente novamente.';
  }

  if (msg.includes('ml api') || msg.includes('hugging') || msg.includes('503') || msg.includes('502')) {
    return 'O serviço de análise está temporariamente fora do ar. Alguns recursos podem ser limitados.';
  }

  if (msg.includes('quota') || msg.includes('resource-exhausted')) {
    return 'O limite de uso foi atingido. Tente novamente mais tarde.';
  }

  if (fallback) return fallback;

  return 'Algo deu errado. Verifique a conexão e tente novamente.';
}
