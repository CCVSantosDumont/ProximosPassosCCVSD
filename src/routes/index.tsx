import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Icone, type NomeIcone } from "@/components/icone";
import { Confetti } from "@/components/confetti";
import { submitRegistration } from "@/lib/registration.functions";
import { versiculos } from "@/lib/versiculos";
import { dataNascimentoValida, hojeIso } from "@/lib/idade";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CCVideira Santos Dumont — Próximos Passos" },
      {
        name: "description",
        content:
          "Bem-vindo à família CCVideira. Servir, conhecer um GC, iniciar um curso e generosidade. Dê o seu próximo passo.",
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
    id: "servir",
    icone: "heart-bold",
    title: "Servir",
    desc: "Quero me tornar um voluntário",
    proximo: "Nossa equipe de voluntários vai te apresentar os ministérios.",
  },
  {
    id: "gc",
    icone: "users-three-bold",
    title: "Conhecer um GC",
    desc: "Quero participar de um Grupo de Crescimento",
    proximo: "Um líder de GC vai te chamar no WhatsApp com um grupo perto de você.",
  },
  {
    id: "curso",
    icone: "book-open-text-bold",
    title: "Iniciar um Curso",
    desc: "Quero aprender mais sobre a Palavra de Deus",
    proximo: "O link do curso gratuito já está a caminho do seu e-mail.",
  },
  {
    id: "generosidade",
    icone: "hand-coins-bold",
    title: "Generosidade",
    desc: "Quero contribuir financeiramente nessa casa.",
    proximo: "Obrigado por semear nesta casa. Que Deus multiplique a sua generosidade!",
  },
] as const satisfies ReadonlyArray<{ id: string; icone: NomeIcone; [k: string]: string }>;

const CHAVE_PIX = "generosidadesd@ccvideira.com.br";

type PassoId = (typeof proximosPassos)[number]["id"];

const diasSemana = ["Segunda", "Terça", "Sexta", "Sábado"] as const;
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
    dataNascimento: z
      .string()
      .min(1, "Informe a sua data de nascimento")
      .refine((v) => dataNascimentoValida(v), "Confere a sua data de nascimento"),
    estadoCivil: z.string().min(1, "Escolha o seu estado civil"),
  }),
  local: z.object({
    bairro: z.string().trim().min(2, "Informe o seu bairro").max(100),
    cidade: z.string().trim().min(2, "Informe a sua cidade").max(100),
  }),
  primeira: z.object({ primeiraVez: z.string().min(1, "Conta pra gente se é sua primeira vez") }),
  dias: z.object({ diasGC: z.array(z.string()).min(1, "Escolha pelo menos um dia") }),
  pix: z.object({}),
} as const;

type EtapaId = keyof typeof validacoes;

const formInicial = {
  nome: "",
  email: "",
  telefone: "",
  estadoCivil: "",
  bairro: "",
  cidade: "",
  primeiraVez: "",
  proximosPassos: [] as PassoId[],
  diasGC: [] as string[],
  dataNascimento: "",
};

// Estilos compartilhados do design (Sleek)
const titulo = "font-heading text-[36px] leading-[1.05] font-bold tracking-tight text-foreground";
const campo =
  "h-16 w-full rounded-2xl border border-white/10 bg-input text-xl text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring";
const selecionado =
  "border-white bg-white font-semibold text-background shadow-[0_0_28px_rgba(255,255,255,0.22)]";
const naoSelecionado = "border-white/10 bg-card font-medium text-foreground hover:border-white/30";

function Index() {
  const sendRegistration = useServerFn(submitRegistration);
  const [form, setForm] = useState(formInicial);
  const [etapa, setEtapa] = useState(0);
  const [direcao, setDirecao] = useState<"frente" | "volta">("frente");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // Dias do GC só para quem escolheu GC; PIX só para quem escolheu Generosidade
  const querGC = form.proximosPassos.includes("gc");
  const querPix = form.proximosPassos.includes("generosidade");
  const etapasNumeradas: EtapaId[] = [
    "passos",
    "nome",
    "contato",
    "sobre",
    "local",
    "primeira",
    ...(querGC ? (["dias"] as const) : []),
  ];
  // A tela do PIX fecha o fluxo e não entra na contagem "Passo X de N"
  const etapas: EtapaId[] = [...etapasNumeradas, ...(querPix ? (["pix"] as const) : [])];
  const etapaAtual = etapas[Math.min(etapa, etapas.length - 1)];
  const ultima = etapa === etapas.length - 1;
  const totalPassos = etapasNumeradas.length;
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
      window.scrollTo({ top: 0 });
      return;
    }
    setLoading(true);
    try {
      await sendRegistration({
        data: {
          ...form,
          nome: form.nome.trim(),
          email: form.email.trim(),
          bairro: form.bairro.trim(),
          cidade: form.cidade.trim(),
          primeiraVez: form.primeiraVez as "Sim" | "Não",
          diasGC: querGC ? (form.diasGC as (typeof diasSemana)[number][]) : [],
        },
      });
      setDone(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      console.error(err);
      // Mensagens do servidor já vêm prontas para o usuário; erros de rede não
      const msg = err instanceof Error && !/fetch|network/i.test(err.message) ? err.message : "";
      toast.error(msg || "Sem conexão com o servidor. Confira sua internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  const voltar = () => {
    setDirecao("volta");
    setEtapa((e) => Math.max(0, e - 1));
  };

  const recomecar = () => {
    setForm(formInicial);
    setEtapa(0);
    setDone(false);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void avancar();
  };

  const rotuloBotao = loading
    ? "Enviando..."
    : etapaAtual === "pix"
      ? "Continuar"
      : ultima
        ? "Dar meu próximo passo 🎉"
        : etapaAtual === "passos"
          ? `Próximo${form.proximosPassos.length ? ` (${form.proximosPassos.length})` : ""}`
          : "Continuar";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Toaster theme="dark" position="top-center" />
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />

      <form
        onSubmit={onSubmit}
        noValidate
        className="relative mx-auto flex min-h-screen w-full max-w-lg flex-col px-6 pb-32 pt-6"
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="font-heading text-base font-bold tracking-tight text-foreground">
              CCVideira Santos Dumont
            </span>
            <span className="text-xs font-medium text-muted-foreground" aria-live="polite">
              {done
                ? "Concluído"
                : etapaAtual === "pix"
                  ? "Generosidade"
                  : `Passo ${etapa + 1} de ${totalPassos}`}
            </span>
          </div>
          <Progresso
            total={totalPassos}
            atual={done || etapaAtual === "pix" ? totalPassos - 1 : etapa}
          />
        </div>

        <div
          key={done ? "fim" : etapaAtual}
          className={cn(
            "flex flex-col animate-in fade-in duration-500",
            done
              ? "zoom-in-95"
              : direcao === "frente"
                ? "slide-in-from-right-8"
                : "slide-in-from-left-8",
          )}
        >
          {done && <Celebracao nome={primeiroNome} passos={form.proximosPassos} />}

          {!done && etapaAtual === "passos" && (
            <>
              <div className="mt-6 flex flex-col gap-3">
                <h1 className={titulo}>Bem-vindo à família Videira!</h1>
                <p className="text-base leading-relaxed text-muted-foreground">
                  Qual o seu próximo passo? Pode escolher mais de um.
                </p>
              </div>
              <div className="mt-6 flex flex-col gap-3">
                {proximosPassos.map((p) => (
                  <CartaoPasso
                    key={p.id}
                    {...p}
                    selecionado={form.proximosPassos.includes(p.id)}
                    onClick={() => toggle("proximosPassos", p.id)}
                  />
                ))}
              </div>
            </>
          )}

          {!done && etapaAtual === "nome" && (
            <div className="mt-10 flex flex-col gap-4">
              <Emoji label="aceno">👋</Emoji>
              <h1 className={titulo}>Que alegria ter você aqui!</h1>
              <label htmlFor="nome" className="text-lg text-muted-foreground">
                Como podemos te chamar?
              </label>
              <CampoTexto
                id="nome"
                autoComplete="name"
                placeholder="Seu nome completo"
                value={form.nome}
                onChange={(v) => set("nome", v)}
              />
            </div>
          )}

          {!done && etapaAtual === "contato" && (
            <div className="mt-10 flex flex-col gap-4">
              <h1 className={titulo}>
                Prazer, {primeiroNome}!{" "}
                <span role="img" aria-label="palmas">
                  🙌
                </span>
              </h1>
              <p className="text-lg text-muted-foreground">Por onde a gente fala com você?</p>
              <div className="mt-4 flex flex-col gap-5">
                <CampoTexto
                  id="telefone"
                  label="WhatsApp"
                  icone="whatsapp-logo-bold"
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
                  icone="envelope-simple-bold"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seuemail@exemplo.com"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  autoFocus={false}
                />
              </div>
            </div>
          )}

          {!done && etapaAtual === "sobre" && (
            <>
              <h1 className={cn(titulo, "mt-6")}>Conta um pouquinho sobre você</h1>
              <Grupo titulo="Data de nascimento" htmlFor="nascimento">
                <input
                  id="nascimento"
                  type="date"
                  autoComplete="bday"
                  min="1900-01-01"
                  max={hojeIso()}
                  value={form.dataNascimento}
                  onChange={(e) => set("dataNascimento", e.target.value)}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-input px-5 text-base text-foreground [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </Grupo>
              <Grupo titulo="Estado civil">
                <div className="flex flex-wrap gap-3">
                  {estadosCivis.map((e) => (
                    <button
                      type="button"
                      key={e.value}
                      onClick={() => set("estadoCivil", e.value)}
                      aria-pressed={form.estadoCivil === e.value}
                      className={cn(
                        "min-h-12 rounded-full border px-5 text-base transition-all active:scale-95",
                        form.estadoCivil === e.value ? selecionado : naoSelecionado,
                      )}
                    >
                      {e.label}
                    </button>
                  ))}
                </div>
              </Grupo>
            </>
          )}

          {!done && etapaAtual === "local" && (
            <div className="mt-6 flex flex-col gap-4">
              <Emoji label="casa">🏡</Emoji>
              <h1 className={titulo}>Onde você mora?</h1>
              <p className="text-base text-muted-foreground">
                {querGC
                  ? "Assim encontramos um GC pertinho de você."
                  : "Queremos estar perto de você."}
              </p>
              <div className="mt-2 flex flex-col gap-5">
                <CampoTexto
                  id="bairro"
                  label="Bairro"
                  autoComplete="address-level3"
                  placeholder="Ex.: Centro"
                  value={form.bairro}
                  onChange={(v) => set("bairro", v)}
                />
                <CampoTexto
                  id="cidade"
                  label="Cidade"
                  autoComplete="address-level2"
                  placeholder="Ex.: Santos Dumont"
                  value={form.cidade}
                  onChange={(v) => set("cidade", v)}
                  autoFocus={false}
                />
              </div>
            </div>
          )}

          {!done && etapaAtual === "primeira" && (
            <>
              <h1 className={cn(titulo, "mt-6")}>É a sua primeira vez na Videira?</h1>
              <div className="mt-6 flex flex-col gap-3">
                {(
                  [
                    { valor: "Sim", texto: "Sim, primeira vez!", icone: "sparkle-bold" },
                    { valor: "Não", texto: "Não, já vim antes", icone: "arrows-clockwise-bold" },
                  ] as const
                ).map((o) => {
                  const ativo = form.primeiraVez === o.valor;
                  return (
                    <button
                      type="button"
                      key={o.valor}
                      onClick={() => set("primeiraVez", o.valor)}
                      aria-pressed={ativo}
                      className={cn(
                        "flex h-20 w-full items-center justify-between rounded-2xl border px-6 text-left text-lg transition-all active:scale-[0.98]",
                        ativo ? selecionado : naoSelecionado,
                      )}
                    >
                      <span className="flex items-center gap-4">
                        <Icone nome={o.icone} className={ativo ? "" : "text-muted-foreground"} />
                        {o.texto}
                      </span>
                      {ativo ? (
                        <Icone nome="check-circle-fill" className="animate-pop" />
                      ) : (
                        <span className="size-6 rounded-full border border-white/20" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!done && etapaAtual === "dias" && (
            <>
              <div className="mt-6 flex flex-col gap-4">
                <Emoji label="calendário">📅</Emoji>
                <h1 className={titulo}>Qual o melhor dia para o seu GC?</h1>
                <p className="text-base text-muted-foreground">Pode escolher mais de um.</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {diasSemana.map((dia) => (
                  <button
                    type="button"
                    key={dia}
                    onClick={() => toggle("diasGC", dia)}
                    aria-pressed={form.diasGC.includes(dia)}
                    className={cn(
                      "flex h-24 items-center justify-center rounded-2xl border font-heading text-xl transition-all active:scale-95",
                      form.diasGC.includes(dia) ? selecionado : naoSelecionado,
                      "font-semibold",
                    )}
                  >
                    {dia}
                  </button>
                ))}
              </div>
            </>
          )}

          {!done && etapaAtual === "pix" && <EtapaPix />}
        </div>

        <Versiculo fixo={etapaAtual === "pix" && !done ? versiculoGenerosidade : undefined} />

        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-white/10 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-lg gap-3 px-6 py-4">
            {done ? (
              <button
                type="button"
                onClick={recomecar}
                className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-base font-semibold text-background"
              >
                Voltar ao início
              </button>
            ) : (
              <>
                {etapa > 0 && (
                  <button
                    type="button"
                    onClick={voltar}
                    aria-label="Voltar"
                    className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-card text-foreground"
                  >
                    <Icone nome="arrow-left-bold" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    loading || (etapaAtual === "passos" && form.proximosPassos.length === 0)
                  }
                  className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-white text-base font-semibold text-background transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40"
                >
                  {rotuloBotao}
                </button>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

function Progresso({ total, atual }: { total: number; atual: number }) {
  return (
    <div
      role="progressbar"
      className="flex gap-1.5"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={atual + 1}
    >
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/15">
          <div
            className={cn(
              "h-full rounded-full bg-white transition-all duration-500",
              i <= atual ? "w-full" : "w-0",
            )}
          />
        </div>
      ))}
    </div>
  );
}

function CartaoPasso({
  icone,
  title,
  desc,
  selecionado: ativo,
  onClick,
}: {
  icone: NomeIcone;
  title: string;
  desc: string;
  selecionado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border px-5 py-5 text-left transition-all duration-300 active:scale-[0.98]",
        ativo
          ? "border-white bg-white text-background shadow-[0_0_28px_rgba(255,255,255,0.22)]"
          : "border-white/10 bg-card text-foreground hover:border-white/30",
      )}
    >
      <span
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          ativo ? "bg-background/10" : "bg-white/5",
        )}
      >
        <Icone nome={icone} />
      </span>
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="font-heading text-lg font-semibold tracking-tight">{title}</span>
        <span className={cn("text-sm", ativo ? "opacity-75" : "text-muted-foreground")}>
          {desc}
        </span>
      </span>
      {ativo ? (
        <span className="animate-pop flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-foreground">
          <Icone nome="check-bold" size={16} />
        </span>
      ) : (
        <span className="flex size-7 shrink-0 rounded-full border border-white/20" />
      )}
    </button>
  );
}

function Emoji({ label, children }: { label: string; children: string }) {
  return (
    <span role="img" aria-label={label} className="animate-pop text-6xl leading-none">
      {children}
    </span>
  );
}

function Grupo({
  titulo: t,
  htmlFor,
  children,
}: {
  titulo: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  const classe = "font-heading text-lg font-semibold tracking-tight text-foreground";
  return (
    <div className="mt-6 flex flex-col gap-3">
      {htmlFor ? (
        <label htmlFor={htmlFor} className={classe}>
          {t}
        </label>
      ) : (
        <h2 className={classe}>{t}</h2>
      )}
      {children}
    </div>
  );
}

function CampoTexto({
  id,
  label,
  icone,
  value,
  onChange,
  autoFocus = true,
  ...rest
}: {
  id: string;
  label?: string;
  icone?: NomeIcone;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
} & Omit<React.ComponentProps<"input">, "id" | "value" | "onChange" | "autoFocus">) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  const input = (
    <div className="relative">
      {icone && (
        <Icone
          nome={icone}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
      )}
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(campo, icone ? "pl-14 pr-5" : "px-5")}
        {...rest}
      />
    </div>
  );
  if (!label) return input;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {input}
    </div>
  );
}

const versiculoGenerosidade = {
  texto:
    "Cada um dê conforme determinou em seu coração, não com tristeza nem por obrigação, pois Deus ama quem dá com alegria.",
  ref: "2 Coríntios 9:7",
};

function Versiculo({ fixo }: { fixo?: { texto: string; ref: string } }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    // Começa num versículo aleatório (só no cliente) e troca a cada 9s
    setI(Math.floor(Math.random() * versiculos.length));
    const t = setInterval(() => setI((n) => (n + 1) % versiculos.length), 9000);
    return () => clearInterval(t);
  }, []);
  const v = fixo ?? versiculos[i];
  return (
    <figure className="mt-auto min-h-[8rem] pt-10 text-center" aria-live="polite">
      <div
        key={fixo ? "fixo" : i}
        className="animate-in fade-in slide-in-from-bottom-2 duration-700"
      >
        <blockquote className="text-base italic leading-relaxed text-foreground/90">
          “{v.texto}”
        </blockquote>
        <figcaption className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {v.ref}
        </figcaption>
      </div>
    </figure>
  );
}

function EtapaPix() {
  const [copiado, setCopiado] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(CHAVE_PIX);
      setCopiado(true);
      toast.success("Chave PIX copiada!");
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      toast.error(`Não deu para copiar. A chave é ${CHAVE_PIX}`);
    }
  };

  return (
    <>
      <div className="mt-8 flex flex-col gap-4">
        <Emoji label="mãos em oração">🙏</Emoji>
        <h1 className={titulo}>Sua generosidade abençoa esta casa</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">
          Contribua via PIX. Qualquer valor é recebido com gratidão.
        </p>
      </div>
      <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-white/10 bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
            <Icone nome="qr-code-bold" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Chave PIX (e-mail)
            </span>
            <span className="break-all font-heading text-lg font-semibold tracking-tight text-foreground select-all">
              {CHAVE_PIX}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void copiar()}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-base font-semibold text-background transition-all active:scale-[0.98]"
        >
          <Icone nome={copiado ? "check-bold" : "copy-bold"} size={20} />
          {copiado ? "Chave copiada!" : "Copiar chave PIX"}
        </button>
      </div>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-card/60 p-5">
        <p className="text-sm font-semibold text-foreground">Como fazer</p>
        {[
          "Abra o aplicativo do seu banco e escolha PIX.",
          "Cole a chave acima e informe o valor que desejar.",
          "Confirme. Obrigado por fazer parte da família!",
        ].map((t, i) => (
          <div key={t} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-foreground">
              {i + 1}
            </span>
            <span>{t}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Celebracao({ nome, passos }: { nome: string; passos: PassoId[] }) {
  return (
    <>
      <Confetti />
      <div className="mt-6 flex flex-col items-start gap-4">
        <Emoji label="festa">🎉</Emoji>
        <h1 className={titulo}>Bem-vindo à família, {nome}!</h1>
        <p className="text-base leading-relaxed text-muted-foreground">
          O céu está em festa e a gente também. Em breve alguém da nossa equipe vai te chamar no
          WhatsApp.
        </p>
      </div>
      <div className="mt-6 flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">
          Seus próximos passos
        </h2>
        {proximosPassos
          .filter((p) => passos.includes(p.id))
          .map(({ id, icone, title, proximo }, idx) => (
            <div
              key={id}
              className="flex gap-4 rounded-2xl border border-white/10 bg-card/80 p-4 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-500"
              style={{ animationDelay: `${200 + idx * 150}ms`, animationFillMode: "both" }}
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white/5">
                <Icone nome={icone} />
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-heading text-base font-semibold text-foreground">
                  {title}
                </span>
                <span className="text-sm leading-relaxed text-muted-foreground">{proximo}</span>
              </div>
            </div>
          ))}
      </div>
    </>
  );
}
