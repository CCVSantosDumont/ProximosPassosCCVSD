import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Icone, type NomeIcone } from "@/components/icone";
import {
  entrarAdmin,
  listarInscricoes,
  sairAdmin,
  type Inscricao,
  type PassoId,
} from "@/lib/admin.functions";
import { cn } from "@/lib/utils";
import logoCcv from "@/assets/logo-ccv.png";
import { calcularIdade, ehAniversarioHoje, formatarData } from "@/lib/idade";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Painel da Staff — CCVideira Santos Dumont" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Admin,
});

const PASSOS: { id: PassoId; label: string; icone: NomeIcone }[] = [
  { id: "servir", label: "Servir", icone: "heart-bold" },
  { id: "gc", label: "Conhecer um GC", icone: "users-three-bold" },
  { id: "curso", label: "Iniciar um Curso", icone: "book-open-text-bold" },
  { id: "generosidade", label: "Generosidade", icone: "hand-coins-bold" },
];
const LABEL_PASSO = Object.fromEntries(PASSOS.map((p) => [p.id, p.label])) as Record<
  PassoId,
  string
>;

const ESTADO_CIVIL: Record<string, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  "uniao-estavel": "União estável",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
};

const DIAS = ["Segunda", "Terça", "Sexta", "Sábado"];

const PERIODOS = [
  { id: "7", label: "7 dias", dias: 7 },
  { id: "30", label: "30 dias", dias: 30 },
  { id: "tudo", label: "Tudo", dias: null },
] as const;

const DIA_MS = 86_400_000;

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function tempoRelativo(iso: string) {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / DIA_MS);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "ontem";
  if (dias < 30) return `há ${dias} dias`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

function linkWhatsApp(telefone: string, nome: string) {
  let d = telefone.replace(/\D/g, "");
  if (d.length <= 11) d = `55${d}`;
  const msg = `Olá, ${nome.split(" ")[0]}! Aqui é da CCVideira Santos Dumont 😊`;
  return `https://wa.me/${d}?text=${encodeURIComponent(msg)}`;
}

function exportarCsv(lista: Inscricao[]) {
  const cab = [
    "Data",
    "Nome",
    "E-mail",
    "WhatsApp",
    "Estado civil",
    "Bairro",
    "Cidade",
    "Primeira vez",
    "Próximos passos",
    "Dias GC",
    "Data de nascimento",
    "Idade",
  ];
  const linhas = lista.map((i) => [
    new Date(i.data).toLocaleString("pt-BR"),
    i.nome,
    i.email,
    i.telefone,
    ESTADO_CIVIL[i.estadoCivil] ?? i.estadoCivil,
    i.bairro,
    i.cidade,
    i.primeiraVez ? "Sim" : "Não",
    i.passos.map((p) => LABEL_PASSO[p]).join(", "),
    i.diasGC.join(", "),
    i.dataNascimento ? formatarData(i.dataNascimento) : "",
    i.dataNascimento ? (calcularIdade(i.dataNascimento) ?? "") : "",
  ]);
  const csv = [cab, ...linhas]
    .map((l) => l.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(";"))
    .join("\n");
  // BOM para o Excel abrir os acentos corretamente
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `inscricoes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

type Estado =
  | { fase: "carregando" }
  | { fase: "login" }
  | { fase: "erro"; mensagem: string }
  | { fase: "pronto"; inscricoes: Inscricao[] };

function Admin() {
  const listar = useServerFn(listarInscricoes);
  const [estado, setEstado] = useState<Estado>({ fase: "carregando" });
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    setAtualizando(true);
    try {
      const r = await listar();
      setEstado(r.autenticado ? { fase: "pronto", inscricoes: r.inscricoes } : { fase: "login" });
    } catch (err) {
      console.error(err);
      setEstado({ fase: "erro", mensagem: "Não foi possível carregar as inscrições." });
    } finally {
      setAtualizando(false);
    }
  }, [listar]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />
      <div className="bg-dots pointer-events-none fixed inset-0 opacity-[0.04]" aria-hidden />
      {estado.fase === "carregando" && <Centro>Carregando...</Centro>}
      {estado.fase === "login" && <Login onEntrar={carregar} />}
      {estado.fase === "erro" && (
        <Centro>
          <p>{estado.mensagem}</p>
          <button
            onClick={() => void carregar()}
            className="mt-4 h-12 rounded-2xl bg-white px-6 font-semibold text-background"
          >
            Tentar de novo
          </button>
        </Centro>
      )}
      {estado.fase === "pronto" && (
        <Painel
          inscricoes={estado.inscricoes}
          atualizando={atualizando}
          onAtualizar={carregar}
          onSair={() => setEstado({ fase: "login" })}
        />
      )}
    </div>
  );
}

function Centro({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center text-muted-foreground">
      {children}
    </div>
  );
}

function Login({ onEntrar }: { onEntrar: () => Promise<void> }) {
  const entrar = useServerFn(entrarAdmin);
  const [senha, setSenha] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senha) return;
    setEnviando(true);
    try {
      const r = await entrar({ data: { senha } });
      if (!r.ok) {
        toast.error("Senha incorreta.");
        return;
      }
      await onEntrar();
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível entrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-6 pb-10 pt-10">
      <div className="flex flex-1 flex-col justify-center gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex size-44 items-center justify-center rounded-full border border-white/20 bg-black">
            <img src={logoCcv} alt="CCVideira" className="size-full rounded-full object-cover" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight">
            CCVideira Santos Dumont
          </span>
        </div>
        <div className="flex flex-col gap-2 text-center">
          <h1 className="font-heading text-[36px] font-bold leading-[1.05] tracking-tight">
            Painel da Staff
          </h1>
          <p className="text-base text-muted-foreground">Acesso restrito à equipe da igreja.</p>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="senha" className="text-sm font-medium">
              Senha
            </label>
            <div className="relative">
              <Icone
                nome="lock-simple-bold"
                size={20}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                id="senha"
                type={mostrar ? "text" : "password"}
                autoComplete="current-password"
                autoFocus
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Digite sua senha"
                className="h-14 w-full rounded-2xl border border-white/10 bg-input pl-12 pr-14 text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setMostrar((m) => !m)}
                aria-label={mostrar ? "Esconder senha" : "Mostrar senha"}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground"
              >
                <Icone nome={mostrar ? "eye-slash-bold" : "eye-bold"} size={20} />
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={enviando || !senha}
            className="mt-2 flex h-14 w-full items-center justify-center rounded-2xl bg-white text-base font-semibold text-background disabled:opacity-40"
          >
            {enviando ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Esqueceu a senha? Fale com a coordenação da igreja.
      </p>
    </div>
  );
}

function Painel({
  inscricoes,
  atualizando,
  onAtualizar,
  onSair,
}: {
  inscricoes: Inscricao[];
  atualizando: boolean;
  onAtualizar: () => Promise<void>;
  onSair: () => void;
}) {
  const sair = useServerFn(sairAdmin);
  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<(typeof PERIODOS)[number]["id"]>("tudo");
  const [passo, setPasso] = useState<PassoId | null>(null);

  const kpis = useMemo(() => {
    const semana = Date.now() - 7 * DIA_MS;
    return {
      total: inscricoes.length,
      semana: inscricoes.filter((i) => new Date(i.data).getTime() >= semana).length,
      primeiraVez: inscricoes.filter((i) => i.primeiraVez).length,
    };
  }, [inscricoes]);

  // Período + busca valem para tudo; o filtro de passo só para a lista
  const noPeriodo = useMemo(() => {
    const dias = PERIODOS.find((p) => p.id === periodo)?.dias;
    const desde = dias ? Date.now() - dias * DIA_MS : 0;
    const q = semAcento(busca.trim());
    const qDigitos = busca.replace(/\D/g, "");
    return inscricoes.filter((i) => {
      if (new Date(i.data).getTime() < desde) return false;
      if (!q) return true;
      return (
        semAcento(`${i.nome} ${i.bairro} ${i.cidade} ${i.email}`).includes(q) ||
        (qDigitos.length >= 3 && i.telefone.replace(/\D/g, "").includes(qDigitos))
      );
    });
  }, [inscricoes, periodo, busca]);

  const lista = passo ? noPeriodo.filter((i) => i.passos.includes(passo)) : noPeriodo;

  const porPasso = (id: PassoId) => noPeriodo.filter((i) => i.passos.includes(id)).length;

  const dias = DIAS.map((d) => ({
    label: d,
    total: lista.filter((i) => i.diasGC.includes(d)).length,
  }));
  const maxDia = Math.max(1, ...dias.map((d) => d.total));

  const bairros = Object.entries(
    lista.reduce<Record<string, number>>((acc, i) => {
      const b = i.bairro.trim();
      if (b) acc[b] = (acc[b] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const onSairClick = async () => {
    await sair();
    onSair();
  };

  return (
    <div className="relative">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground">
              CCVIDEIRA SANTOS DUMONT
            </p>
            <h1 className="font-heading text-xl font-bold tracking-tight">Painel da Staff</h1>
          </div>
          <div className="flex gap-2">
            <BotaoIcone
              nome="arrows-clockwise-bold"
              label="Atualizar"
              onClick={() => void onAtualizar()}
              girando={atualizando}
            />
            <BotaoIcone nome="sign-out-bold" label="Sair" onClick={() => void onSairClick()} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <div className="grid grid-cols-3 gap-3">
          <Kpi label="Total de inscrições" valor={kpis.total} />
          <Kpi label="Últimos 7 dias" valor={kpis.semana} />
          <Kpi label="Primeira vez" valor={kpis.primeiraVez} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {PASSOS.map((p) => {
            const ativo = passo === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPasso(ativo ? null : p.id)}
                aria-pressed={ativo}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition-all active:scale-[0.98]",
                  ativo
                    ? "border-white bg-white text-background shadow-[0_0_24px_rgba(255,255,255,0.18)]"
                    : "border-white/10 bg-card hover:border-white/30",
                )}
              >
                <Icone nome={p.icone} className="shrink-0" />
                <span className="flex-1 text-sm font-medium leading-tight sm:text-base">
                  {p.label}
                </span>
                <span className="font-heading text-xl font-bold">{porPasso(p.id)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="relative">
            <Icone
              nome="magnifying-glass-bold"
              size={20}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nome, telefone ou bairro"
              className="h-12 w-full rounded-2xl border border-white/10 bg-input pl-11 pr-4 text-base placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriodo(p.id)}
                aria-pressed={periodo === p.id}
                className={cn(
                  "h-9 rounded-full border px-3 text-sm font-medium",
                  periodo === p.id
                    ? "border-white bg-white text-background"
                    : "border-white/10 bg-card",
                )}
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => exportarCsv(lista)}
              disabled={lista.length === 0}
              className="ml-auto flex h-9 items-center gap-2 rounded-full border border-white/10 bg-card px-3 text-sm font-medium disabled:opacity-40"
            >
              <Icone nome="download-simple-bold" size={16} />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="font-heading text-base font-semibold">
              Inscritos <span className="text-muted-foreground">· {lista.length}</span>
              {passo && <span className="text-muted-foreground"> em {LABEL_PASSO[passo]}</span>}
            </h2>
            {lista.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">
                {inscricoes.length === 0
                  ? "Ainda não há inscrições. Elas aparecem aqui assim que alguém se cadastrar no site."
                  : "Ninguém encontrado com esses filtros."}
              </p>
            ) : (
              <ul className="mt-3 grid gap-3 md:grid-cols-2">
                {lista.map((i) => (
                  <CartaoInscrito key={i.id} i={i} />
                ))}
              </ul>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-card p-4">
              <h3 className="font-heading text-base font-semibold">Dias preferidos para GC</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {dias.map((d) => (
                  <li key={d.label}>
                    <div className="flex justify-between text-sm">
                      <span>{d.label}</span>
                      <span className="text-muted-foreground">{d.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-white transition-all duration-500"
                        style={{
                          width: `${(d.total / maxDia) * 100}%`,
                          opacity: 0.4 + 0.6 * (d.total / maxDia),
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-white/10 bg-card p-4">
              <h3 className="font-heading text-base font-semibold">Bairros com mais inscrições</h3>
              {bairros.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Sem dados ainda.</p>
              ) : (
                <ol className="mt-3 flex flex-col gap-2 text-sm">
                  {bairros.map(([b, n], idx) => (
                    <li key={b} className="flex items-center gap-4">
                      <span className="w-3 text-muted-foreground">{idx + 1}</span>
                      <span className="flex-1">{b}</span>
                      <span className="font-semibold">{n}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function BotaoIcone({
  nome,
  label,
  onClick,
  girando,
}: {
  nome: NomeIcone;
  label: string;
  onClick: () => void;
  girando?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-full border border-white/10 bg-card hover:border-white/30"
    >
      <Icone nome={nome} size={20} className={girando ? "animate-spin" : ""} />
    </button>
  );
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex flex-col justify-between gap-2 rounded-2xl border border-white/10 bg-card p-3 sm:p-4">
      <span className="text-xs leading-snug text-muted-foreground">{label}</span>
      <span className="font-heading text-2xl font-bold sm:text-3xl">{valor}</span>
    </div>
  );
}

function CartaoInscrito({ i }: { i: Inscricao }) {
  const idade = i.dataNascimento ? calcularIdade(i.dataNascimento) : null;
  const aniversario = i.dataNascimento ? ehAniversarioHoje(i.dataNascimento) : false;
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-semibold">{i.nome}</p>
          <p
            className="text-sm text-muted-foreground"
            title={new Date(i.data).toLocaleString("pt-BR")}
          >
            {tempoRelativo(i.data)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {i.primeiraVez && (
            <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-background">
              Primeira vez
            </span>
          )}
          {aniversario && (
            <span className="rounded-full border border-white/30 px-2.5 py-1 text-xs font-semibold">
              🎂 Aniversário hoje
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {i.passos.map((p) => (
          <span key={p} className="rounded-full border border-white/15 px-2.5 py-0.5 text-xs">
            {LABEL_PASSO[p]}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-sm">
        <Icone nome="map-pin-bold" size={16} className="text-muted-foreground" />
        {i.bairro} · {i.cidade}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <Dado
          rotulo="Idade"
          valor={idade !== null ? `${idade} ${idade === 1 ? "ano" : "anos"}` : "—"}
        />
        <Dado rotulo="Nascimento" valor={i.dataNascimento ? formatarData(i.dataNascimento) : "—"} />
        <Dado rotulo="Estado civil" valor={ESTADO_CIVIL[i.estadoCivil] ?? i.estadoCivil} />
        {i.diasGC.length > 0 && <Dado rotulo="Dias para GC" valor={i.diasGC.join(", ")} />}
        <Dado rotulo="WhatsApp" valor={i.telefone} />
      </dl>
      <div className="mt-auto flex gap-2 pt-1">
        <a
          href={linkWhatsApp(i.telefone, i.nome)}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-white font-semibold text-background hover:bg-white/90"
        >
          <Icone nome="baseline-whatsapp" size={20} />
          WhatsApp
        </a>
        <a
          href={`mailto:${i.email}`}
          aria-label={`Enviar e-mail para ${i.email}`}
          title={i.email}
          className="flex size-12 items-center justify-center rounded-2xl border border-white/10 hover:border-white/30"
        >
          <Icone nome="envelope-simple-bold" size={20} />
        </a>
      </div>
    </li>
  );
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}
