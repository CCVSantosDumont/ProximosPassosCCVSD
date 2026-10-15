import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Gift,
  HandHeart,
  Heart,
  Sparkles,
  Users,
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { submitRegistration } from "@/lib/registration.functions";
import { versiculos } from "@/lib/versiculos";
import { Confetti } from "@/components/confetti";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CCVideira Santos Dumont — Próximos Passos" },
      {
        name: "description",
        content:
          "Bem-vindo à família CCVideira. Abençoar, conhecer um GC, iniciar um curso e servir. Dê o seu próximo passo.",
      },
      { property: "og:title", content: "CCVideira Santos Dumont — Próximos Passos" },
      {
        property: "og:description",
        content: "Caminhe com a gente o próximo passo que Deus preparou para a sua vida.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const proximosPassos = [
  {
    id: "abencoar",
    icon: Heart,
    title: "Abençoar",
    desc: "Quero abençoar a igreja e fazer parte do suporte que mantém as atividades",
    proximo: "Vamos te mostrar como fazer parte do suporte que mantém a igreja de portas abertas.",
  },
  {
    id: "gc",
    icon: Users,
    title: "Conhecer um GC",
    desc: "Quero participar de um Grupo de Crescimento perto de mim",
    proximo: "Um líder de GC vai te chamar no WhatsApp com um grupo perto de você.",
  },
  {
    id: "curso",
    icon: BookOpen,
    title: "Iniciar um Curso",
    desc: "Quero aprender mais sobre a Palavra de Deus",
    proximo: "O link do curso já está a caminho do seu e-mail.",
  },
  {
    id: "servir",
    icon: HandHeart,
    title: "Servir",
    desc: "Quero me tornar um voluntário",
    proximo: "Nossa equipe de voluntários vai te apresentar os ministérios.",
  },
] as const;

type PassoId = (typeof proximosPassos)[number]["id"];

const diasSemana = ["Segunda", "Terça", "Sexta", "Sábado"] as const;
const faixasEtarias = ["8-11", "12-14", "15-17", "18-24", "25-35", "36+"] as const;
const estadosCivis = [
  { value: "solteiro", label: "Solteiro(a)" },
  { value: "casado", label: "Casado(a)" },
  { value: "uniao-estavel", label: "União estável" },
  { value: "divorciado", label: "Divorciado(a)" },
  { value: "viuvo", label: "Viúvo(a)" },
] as const;

const digitos = (v: string) => v.replace(/\D/g, "");

function formatarTelefone(v: string) {
  const d = digitos(v).slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// Cada etapa valida só os campos que ela mostra
const validacoes = {
  passos: z.object({
    proximosPassos: z.array(z.string()).min(1, "Escolha pelo menos um próximo passo"),
  }),
  nome: z.object({ nome: z.string().trim().min(2, "Conta pra gente o seu nome 🙂").max(100) }),
  contato: z.object({
    telefone: z.string().refine((v) => digitos(v).length >= 10, "Confere o seu WhatsApp, com DDD"),
    email: z.string().trim().email("Esse e-mail parece incompleto").max(255),
  }),
  sobre: z.object({
    faixaEtaria: z.string().min(1, "Escolha a sua faixa etária"),
    estadoCivil: z.string().min(1, "Escolha o seu estado civil"),
  }),
  local: z.object({
    bairro: z.string().trim().min(2, "Informe o seu bairro").max(100),
    cidade: z.string().trim().min(2, "Informe a sua cidade").max(100),
  }),
  primeira: z.object({ primeiraVez: z.string().min(1, "Conta pra gente se é sua primeira vez") }),
  dias: z.object({ diasGC: z.array(z.string()).min(1, "Escolha pelo menos um dia") }),
} as const;

type EtapaId = keyof typeof validacoes;

const formInicial = {
  nome: "",
  email: "",
  telefone: "",
  estadoCivil: "",
  bairro: "",
  cidade: "Santos Dumont",
  primeiraVez: "",
  proximosPassos: [] as PassoId[],
  diasGC: [] as string[],
  faixaEtaria: "",
};

function Index() {
  const sendRegistration = useServerFn(submitRegistration);
  const [form, setForm] = useState(formInicial);
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "volta">("frente");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const querGC = form.proximosPassos.includes("gc");
  const etapas: EtapaId[] = [
    "passos",
    "nome",
    "contato",
    "sobre",
    "local",
    "primeira",
    ...(querGC ? (["dias"] as const) : []),
  ];
  const etapaAtual = etapas[Math.min(etapa, etapas.length - 1)];
  const ultima = etapa === etapas.length - 1;
  const primeiroNome = form.nome.trim().split(/\s+/)[0] ?? "";

  const set = <K extends keyof typeof form>(campo: K, valor: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  const toggle = (campo: "proximosPassos" | "diasGC", valor: string) =>
    setForm((f) => {
      const lista = f[campo] as string[];
      return {
        ...f,
        [campo]: lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor],
      };
    });

  const validarEtapa = () => {
    const r = validacoes[etapaAtual].safeParse(form);
    if (!r.success) toast.error(r.error.issues[0].message);
    return r.success;
  };

  const avancar = async () => {
    if (!validarEtapa()) return;
    if (!ultima) {
      setDirecao("frente");
      setEtapa((e) => e + 1);
      return;
    }
    setLoading(true);
    try {
      await sendRegistration({
        data: {
          ...form,
          nome: form.nome.trim(),
          email: form.email.trim(),
          primeiraVez: form.primeiraVez as "Sim" | "Não",
          faixaEtaria: form.faixaEtaria as (typeof faixasEtarias)[number],
          diasGC: querGC ? (form.diasGC as (typeof diasSemana)[number][]) : [],
        },
      });
      setDone(true);
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível concluir a inscrição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const voltar = () => {
    setDirecao("volta");
    setEtapa((e) => Math.max(0, e - 1));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void avancar();
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-background">
      <Toaster theme="dark" position="top-center" />

      <div
        className="pointer-events-none absolute inset-0 opacity-25"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-green-500/10 blur-3xl animate-float"
        aria-hidden
      />

      <main className="relative mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6 pt-6 sm:px-6 sm:pt-10">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-green-400" /> CCVideira Santos Dumont
          </div>
          {!done && (
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              Passo <strong className="text-foreground">{etapa + 1}</strong> de {etapas.length}
            </span>
          )}
        </header>

        {!done && <Progresso total={etapas.length} atual={etapa} />}

        {done ? (
          <Celebracao nome={primeiroNome} passos={form.proximosPassos} />
        ) : (
          <form onSubmit={onSubmit} className="mt-8 flex flex-1 flex-col" noValidate>
            <div
              key={etapaAtual}
              className={`flex-1 animate-in fade-in duration-500 ${direcao === "frente" ? "slide-in-from-right-8" : "slide-in-from-left-8"}`}
            >
              {etapaAtual === "passos" && (
                <EtapaPassos
                  selecionados={form.proximosPassos}
                  onToggle={(id) => toggle("proximosPassos", id)}
                />
              )}

              {etapaAtual === "nome" && (
                <Etapa
                  emoji="👋"
                  titulo="Que alegria ter você aqui!"
                  subtitulo="Como podemos te chamar?"
                >
                  <CampoTexto
                    id="nome"
                    label="Seu nome completo"
                    autoComplete="name"
                    placeholder="Ex.: Maria da Silva"
                    value={form.nome}
                    onChange={(v) => set("nome", v)}
                  />
                </Etapa>
              )}

              {etapaAtual === "contato" && (
                <Etapa
                  emoji="🙌"
                  titulo={`Prazer, ${primeiroNome}!`}
                  subtitulo="Por onde a gente fala com você?"
                >
                  <CampoTexto
                    id="telefone"
                    label="WhatsApp"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="(32) 99999-9999"
                    value={form.telefone}
                    onChange={(v) => set("telefone", formatarTelefone(v))}
                  />
                  <CampoTexto
                    id="email"
                    label="E-mail"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="voce@email.com"
                    value={form.email}
                    onChange={(v) => set("email", v)}
                    autoFocus={false}
                  />
                </Etapa>
              )}

              {etapaAtual === "sobre" && (
                <Etapa
                  emoji="✨"
                  titulo="Conta um pouquinho sobre você"
                  subtitulo="Assim a gente te conecta com as pessoas certas."
                >
                  <Grupo label="Faixa etária">
                    <div className="grid grid-cols-3 gap-2">
                      {faixasEtarias.map((f) => (
                        <Opcao
                          key={f}
                          selecionada={form.faixaEtaria === f}
                          onClick={() => set("faixaEtaria", f)}
                        >
                          {f}
                        </Opcao>
                      ))}
                    </div>
                  </Grupo>
                  <Grupo label="Estado civil">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {estadosCivis.map((e) => (
                        <Opcao
                          key={e.value}
                          selecionada={form.estadoCivil === e.value}
                          onClick={() => set("estadoCivil", e.value)}
                        >
                          {e.label}
                        </Opcao>
                      ))}
                    </div>
                  </Grupo>
                </Etapa>
              )}

              {etapaAtual === "local" && (
                <Etapa
                  emoji="🏡"
                  titulo="Onde você mora?"
                  subtitulo={
                    querGC
                      ? "Assim encontramos um GC pertinho de você."
                      : "Queremos estar perto de você."
                  }
                >
                  <CampoTexto
                    id="bairro"
                    label="Bairro"
                    autoComplete="address-level3"
                    placeholder="Seu bairro"
                    value={form.bairro}
                    onChange={(v) => set("bairro", v)}
                  />
                  <CampoTexto
                    id="cidade"
                    label="Cidade"
                    autoComplete="address-level2"
                    placeholder="Sua cidade"
                    value={form.cidade}
                    onChange={(v) => set("cidade", v)}
                    autoFocus={false}
                  />
                </Etapa>
              )}

              {etapaAtual === "primeira" && (
                <Etapa
                  emoji="⛪"
                  titulo="É a sua primeira vez na Videira?"
                  subtitulo="Sendo a primeira ou a centésima, você é muito bem-vindo!"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {(["Sim", "Não"] as const).map((opt) => (
                      <Opcao
                        key={opt}
                        grande
                        selecionada={form.primeiraVez === opt}
                        onClick={() => set("primeiraVez", opt)}
                      >
                        {opt === "Sim" ? "Sim, primeira vez!" : "Não, já vim antes"}
                      </Opcao>
                    ))}
                  </div>
                </Etapa>
              )}

              {etapaAtual === "dias" && (
                <Etapa
                  emoji="📅"
                  titulo="Qual o melhor dia para o seu GC?"
                  subtitulo="Pode escolher mais de um."
                >
                  <div className="grid grid-cols-2 gap-3">
                    {diasSemana.map((dia) => (
                      <Opcao
                        key={dia}
                        grande
                        selecionada={form.diasGC.includes(dia)}
                        onClick={() => toggle("diasGC", dia)}
                      >
                        {dia}
                      </Opcao>
                    ))}
                  </div>
                </Etapa>
              )}
            </div>

            <div className="sticky bottom-4 mt-8 flex items-center gap-3">
              {etapa > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={voltar}
                  className="h-12 w-12 shrink-0 rounded-xl border-white/10 bg-white/5 p-0"
                  aria-label="Voltar"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <Button
                type="submit"
                disabled={loading || (etapaAtual === "passos" && form.proximosPassos.length === 0)}
                className="h-12 flex-1 rounded-xl bg-green-500 text-base font-semibold text-black shadow-[0_10px_40px_-10px_rgba(34,197,94,0.7)] transition-transform hover:scale-[1.02] hover:bg-green-400 disabled:opacity-40"
              >
                {loading
                  ? "Enviando..."
                  : ultima
                    ? "Dar meu próximo passo 🎉"
                    : etapaAtual === "passos"
                      ? `Próximo${form.proximosPassos.length ? ` (${form.proximosPassos.length})` : ""}`
                      : "Continuar"}
                {!loading && !ultima && <ArrowRight className="ml-1 h-5 w-5" />}
              </Button>
            </div>
            {ultima && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Seus dados estão seguros. Sem spam.
              </p>
            )}
          </form>
        )}

        <Versiculo />
      </main>

      <footer className="relative border-t border-border/50 py-5 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CCVideira Santos Dumont
      </footer>
    </div>
  );
}

function Progresso({ total, atual }: { total: number; atual: number }) {
  return (
    <div
      className="flex gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={atual + 1}
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full bg-green-500 transition-all duration-500 ${i <= atual ? "w-full" : "w-0"}`}
          />
        </div>
      ))}
    </div>
  );
}

function EtapaPassos({
  selecionados,
  onToggle,
}: {
  selecionados: PassoId[];
  onToggle: (id: PassoId) => void;
}) {
  return (
    <div>
      <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl">
        Bem-vindo à <span className="text-green-400">família</span> Videira!
      </h1>
      <p className="mt-4 text-base text-muted-foreground sm:text-lg">
        Que alegria ter você com a gente. Qual o seu próximo passo?{" "}
        <span className="text-foreground">Pode escolher mais de um.</span>
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {proximosPassos.map(({ id, icon: Icon, title, desc }) => {
          const selected = selecionados.includes(id);
          return (
            <button
              type="button"
              key={id}
              onClick={() => onToggle(id)}
              aria-pressed={selected}
              className={`glass group relative flex items-start gap-4 rounded-2xl p-5 text-left transition-all duration-300 hover:-translate-y-0.5 sm:flex-col sm:gap-3 ${
                selected
                  ? "!border-green-500 !bg-green-500/15 ring-2 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.35)]"
                  : "hover:border-white/20"
              }`}
            >
              <div
                className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all group-hover:scale-110 ${
                  selected ? "bg-green-500 text-black" : "bg-white/10 text-foreground"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="pr-6">
                <h3 className="font-display text-lg font-bold">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
              {selected && (
                <span className="animate-pop absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-black">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Etapa({
  emoji,
  titulo,
  subtitulo,
  children,
}: {
  emoji: string;
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="animate-pop text-5xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">{titulo}</h2>
      <p className="mt-2 text-muted-foreground">{subtitulo}</p>
      <div className="mt-8 space-y-5">{children}</div>
    </div>
  );
}

function CampoTexto({
  id,
  label,
  value,
  onChange,
  autoFocus = true,
  ...rest
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
} & Omit<React.ComponentProps<typeof Input>, "id" | "value" | "onChange" | "autoFocus">) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 rounded-xl border-white/10 bg-white/5 text-base focus-visible:ring-green-500"
        {...rest}
      />
    </div>
  );
}

function Grupo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Opcao({
  selecionada,
  onClick,
  grande,
  children,
}: {
  selecionada: boolean;
  onClick: () => void;
  grande?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selecionada}
      className={`rounded-xl border font-medium transition-all active:scale-95 ${grande ? "px-4 py-5 text-base" : "px-3 py-3 text-sm"} ${
        selecionada
          ? "border-green-500 bg-green-500 text-black shadow-[0_0_20px_rgba(34,197,94,0.35)]"
          : "border-white/10 bg-white/5 hover:border-green-500/50"
      }`}
    >
      {children}
    </button>
  );
}

function Versiculo() {
  const [i, setI] = useState(0);
  useEffect(() => {
    // Começa num versículo aleatório (só no cliente) e troca a cada 9s
    setI(Math.floor(Math.random() * versiculos.length));
    const t = setInterval(() => setI((n) => (n + 1) % versiculos.length), 9000);
    return () => clearInterval(t);
  }, []);
  const v = versiculos[i];
  return (
    <figure className="mt-10 min-h-[5.5rem] text-center" aria-live="polite">
      <div key={i} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
        <blockquote className="font-display text-sm italic leading-relaxed text-foreground/80 sm:text-base">
          “{v.texto}”
        </blockquote>
        <figcaption className="mt-2 text-xs font-semibold uppercase tracking-widest text-green-400">
          {v.ref}
        </figcaption>
      </div>
    </figure>
  );
}

function Celebracao({ nome, passos }: { nome: string; passos: PassoId[] }) {
  return (
    <div className="mt-6 flex-1 animate-in fade-in zoom-in-95 duration-500">
      <Confetti />
      <div className="animate-pop text-6xl" aria-hidden>
        🎉
      </div>
      <h2 className="mt-4 font-display text-4xl font-bold leading-tight">
        Bem-vindo à família, <span className="text-green-400">{nome}</span>!
      </h2>
      <p className="mt-3 text-muted-foreground">
        O céu está em festa e a gente também. Você não vai caminhar sozinho: em breve alguém da
        nossa equipe vai te chamar no WhatsApp.
      </p>

      <ul className="mt-8 space-y-3">
        {proximosPassos
          .filter((p) => passos.includes(p.id))
          .map(({ id, icon: Icon, title, proximo }, idx) => (
            <li
              key={id}
              className="glass flex items-start gap-4 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${200 + idx * 150}ms`, animationFillMode: "both" }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-500 text-black">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display font-bold">{title}</h3>
                <p className="text-sm text-muted-foreground">{proximo}</p>
              </div>
            </li>
          ))}
      </ul>

      <p className="mt-6 flex items-start gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
        <Gift className="mt-0.5 h-5 w-5 shrink-0" />
        <span>
          Presente liberado! Enviamos um <strong>curso gratuito</strong> para o seu e-mail. Confira
          também a caixa de spam.
        </span>
      </p>
    </div>
  );
}
