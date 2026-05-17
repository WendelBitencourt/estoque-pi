import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <title>Casa da Criança — Controle de Estoque</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{
          __html: `
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; font-family: system-ui, sans-serif; }
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
