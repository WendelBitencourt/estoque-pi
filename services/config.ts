/**
 * Configurações de APIs externas.
 *
 * Como adicionar o token da Cosmos API:
 *   1. Crie uma conta em https://cosmos.bluesoft.com.br/
 *   2. Copie o token no painel da Cosmos
 *   3. Crie o arquivo .env.local na raiz do projeto (já está no .gitignore)
 *      com o conteúdo:  EXPO_PUBLIC_COSMOS_TOKEN=seu_token_aqui
 *   4. Reinicie o servidor Expo (npx expo start)
 *
 * Enquanto o token não for configurado, o app pula a Cosmos e usa
 * o Open Food Facts como única fonte externa.
 */

export const COSMOS_TOKEN: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_COSMOS_TOKEN) || '';
