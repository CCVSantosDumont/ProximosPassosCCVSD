# CCVideira Santos Dumont — Próximos Passos

Landing page de captura com formulário de inscrição. Os dados são salvos em uma
planilha do Google (via Apps Script) e o Brevo dispara dois e-mails automáticos:
o curso gratuito para quem se inscreveu e um aviso de novo cadastro.

Stack: **TanStack Start v1** (React 19 + Vite 7), **Tailwind CSS v4**, **Zod**,
**Lucide icons**, **sonner**.

---

## Rodar localmente

```bash
bun install        # ou npm install
bun run dev        # abre em http://localhost:5173
```

| Comando | O que faz |
| --- | --- |
| `bun run dev` | servidor de desenvolvimento |
| `bun run build` | build de produção |
| `bun run preview` | serve o build de produção |
| `bun run lint` | ESLint |

---

## Variáveis de ambiente

| Variável | Obrigatória | Onde usar |
| --- | --- | --- |
| `BREVO_API_KEY` | Sim | Ambiente do servidor (Nunca prefixe com `VITE_`: a chave iria para o bundle do navegador.) |

Leia a chave **dentro** do `.handler()` de `src/lib/registration.functions.ts` —
é a única execução que roda no servidor.

Sem a chave, o formulário responde com erro ao enviar.

---

## Subir no GitHub

```bash
git init
git add .
git commit -m "feat: landing page CCVideira Santos Dumont"
git branch -M main
git remote add origin https://github.com/<usuario>/<repositorio>.git
git push -u origin main
```

---

## Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe o repositório.
2. A Vercel detecta **Vite** automaticamente. Confirme o **Build Command**:
   `vite build`. Não é preciso preencher **Output Directory** — o build gera
   `.vercel/output`, que a Vercel lê diretamente.
3. Em **Environment Variables**, adicione `BREVO_API_KEY` (Production + Preview).
4. Adicione também `NITRO_PRESET=vercel` — assim o build gera o formato certo da
   Vercel em vez do formato Cloudflare.
5. Clique em **Deploy**.

> O projeto usa `@lovable.dev/vite-tanstack-config`, que empacota a aplicação
> com [Nitro](https://nitro.unjs.io). Nitro escolhe a plataforma de destino
> sozinho pelo ambiente, mas `NITRO_PRESET=vercel` deixa isso garantido.

### Se quiser fixar o alvo no código

Em `vite.config.ts`, troque:

```ts
export default defineConfig({
  tanstackStart: { server: { entry: "server" } },
  nitro: { preset: "vercel" },
});
```

### Depois do primeiro deploy

- Ajuste a URL do Apps Script e o link do curso em
  `src/lib/registration.functions.ts` (`SHEETS_URL`, `COURSE_URL`, `SENDER_EMAIL`).
- O Apps Script precisa estar publicado como Web App com acesso **"Qualquer
  pessoa"**, senão a gravação na planilha falha.

---

## Estrutura

```text
src/
├── assets/hero-bg.jpg              imagem de fundo do hero
├── components/ui/                  componentes base (shadcn/ui)
├── lib/registration.functions.ts   envio: planilha + e-mails Brevo
├── routes/__root.tsx               layout raiz
├── routes/index.tsx                landing page + formulário
├── server.ts                       entrada do servidor (SSR)
├── start.ts                        middlewares do TanStack Start
└── styles.css                      tema Tailwind v4 (preto/cinza)
```

`src/routeTree.gen.ts` é gerado automaticamente — não edite à mão.
`wrangler.jsonc` só interessa se você publicar na Cloudflare; para a Vercel pode
ficar como está.
