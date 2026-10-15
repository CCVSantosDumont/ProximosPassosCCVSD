import { createServerFn } from "@tanstack/react-start";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";
import { z } from "zod";
import { db } from "./db.server";

export type PassoId = "generosidade" | "gc" | "curso" | "servir";

export type Inscricao = {
  id: string;
  data: string;
  nome: string;
  email: string;
  telefone: string;
  estadoCivil: string;
  bairro: string;
  cidade: string;
  primeiraVez: boolean;
  passos: PassoId[];
  diasGC: string[];
  /** "AAAA-MM-DD"; null em inscrições anteriores à troca da faixa etária */
  dataNascimento: string | null;
};

const COOKIE = "ccv_admin";
const SESSAO_SEGUNDOS = 60 * 60 * 12;

// Só em desenvolvimento: permite abrir o painel sem configurar nada
const SENHA_DEV = "videira-dev";

function senhaAdmin() {
  return process.env["ADMIN_PASSWORD"] || (import.meta.env.DEV ? SENHA_DEV : undefined);
}

async function assinar(valor: string, segredo: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(valor));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function iguais(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Cookie = "<expira em ms>.<hmac>" assinado com a senha: trocar a senha derruba todas as sessões
async function sessaoValida() {
  const senha = senhaAdmin();
  const cookie = getCookie(COOKIE);
  if (!senha || !cookie) return false;
  const [exp, sig] = cookie.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return iguais(sig, await assinar(exp, senha));
}

export const entrarAdmin = createServerFn({ method: "POST" })
  .validator((data) => z.object({ senha: z.string().min(1).max(200) }).parse(data))
  .handler(async ({ data }) => {
    const senha = senhaAdmin();
    if (!senha) throw new Error("ADMIN_PASSWORD não está configurada.");
    if (!iguais(data.senha, senha)) {
      // Atraso pequeno para desencorajar tentativa e erro
      await new Promise((r) => setTimeout(r, 600));
      return { ok: false as const };
    }
    const exp = String(Date.now() + SESSAO_SEGUNDOS * 1000);
    setCookie(COOKIE, `${exp}.${await assinar(exp, senha)}`, {
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: "lax",
      path: "/",
      maxAge: SESSAO_SEGUNDOS,
    });
    return { ok: true as const };
  });

export const sairAdmin = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie(COOKIE, { path: "/" });
  return { ok: true };
});

export const listarInscricoes = createServerFn({ method: "GET" }).handler(async () => {
  if (!(await sessaoValida())) return { autenticado: false as const };

  const rows = (await db()`
    select id, criado_em, nome, email, telefone, estado_civil, bairro, cidade,
           primeira_vez, passos, dias_gc, status,
           to_char(data_nascimento, 'YYYY-MM-DD') as data_nascimento
    from inscricoes
    order by criado_em desc
    limit 5000
  `) as Array<Record<string, unknown>>;

  const inscricoes: Inscricao[] = rows.map((r) => ({
    id: String(r.id),
    data: new Date(r.criado_em as string).toISOString(),
    nome: String(r.nome),
    email: String(r.email),
    telefone: String(r.telefone),
    estadoCivil: String(r.estado_civil),
    bairro: String(r.bairro),
    cidade: String(r.cidade),
    primeiraVez: Boolean(r.primeira_vez),
    passos: r.passos as PassoId[],
    diasGC: r.dias_gc as string[],
    dataNascimento: (r.data_nascimento as string | null) ?? null,
  }));
  return { autenticado: true as const, inscricoes };
});
