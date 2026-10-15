import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Sparkles, CheckCircle2, Heart, Users, BookOpen, HandHeart } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { submitRegistration } from "@/lib/registration.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CCVideira Santos Dumont — Próximos Passos" },
      { name: "description", content: "Bem-vindo à CCVideira. Decidir, conectar, conhecer e servir. Dê o próximo passo na sua jornada de fé." },
      { property: "og:title", content: "CCVideira Santos Dumont" },
      { property: "og:description", content: "Caminhe com a gente o próximo passo que Deus preparou para a sua vida." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const proximosPassos = [
  { id: "decidir", icon: Heart, title: "DECIDIR", desc: "Quero uma nova vida com Jesus" },
  { id: "conectar", icon: Users, title: "CONECTAR", desc: "Quero fazer parte de um Grupo de Crescimento GC" },
  { id: "conhecer", icon: BookOpen, title: "CONHECER", desc: "Quero aprender mais sobre a Palavra de Deus" },
  { id: "servir", icon: HandHeart, title: "SERVIR", desc: "Quero me tornar um voluntário" },
] as const;

const diasSemana = ["Segunda", "Terça", "Sexta", "Sábado"] as const;
const faixasEtarias = ["8-11", "12-14", "15-17", "18-24", "25-35", "36+"] as const;

const schema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  telefone: z.string().trim().min(10, "Telefone inválido").max(20),
  estadoCivil: z.string().min(1, "Selecione seu estado civil"),
  bairro: z.string().trim().min(2, "Informe seu bairro").max(100),
  cidade: z.string().trim().min(2, "Informe sua cidade").max(100),
  primeiraVez: z.string().min(1, "Informe se é sua primeira vez"),
  proximosPassos: z.array(z.string()).min(1, "Selecione pelo menos um próximo passo"),
  diasGC: z.array(z.string()).min(1, "Selecione pelo menos um dia"),
  faixaEtaria: z.string().min(1, "Selecione sua faixa etária"),
});

function Index() {
  const sendRegistration = useServerFn(submitRegistration);
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    estadoCivil: "",
    bairro: "",
    cidade: "",
    primeiraVez: "",
    proximosPassos: [] as string[],
    diasGC: [] as string[],
    faixaEtaria: "",
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const toggleDia = (dia: string) => {
    setForm((f) => ({
      ...f,
      diasGC: f.diasGC.includes(dia) ? f.diasGC.filter((d) => d !== dia) : [...f.diasGC, dia],
    }));
  };

  const togglePasso = (id: string) => {
    setForm((f) => ({
      ...f,
      proximosPassos: f.proximosPassos.includes(id)
        ? f.proximosPassos.filter((p) => p !== id)
        : [...f.proximosPassos, id],
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    try {
      await sendRegistration({ data: parsed.data });
      setDone(true);
      toast.success("Obrigado pelo seu cadastro! Em breve nossa equipe entrará em contato com você.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível concluir a inscrição. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <Toaster theme="dark" position="top-center" />

      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-aurora" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" aria-hidden />

      <main className="relative">
        {/* HERO + FORM */}
        <section className="container mx-auto grid gap-12 px-6 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-primary">
              <Sparkles className="h-3.5 w-3.5" /> CCVideira Santos Dumont
            </div>

            <h1 className="font-display text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              BEM-VINDO À <span className="text-gradient-primary">CCVIDEIRA</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Queremos caminhar com você e te ajudar a viver o próximo passo que Deus preparou para a sua vida. Estamos aqui para apoiar sua jornada de fé, crescimento e propósito.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {proximosPassos.map(({ id, icon: Icon, title, desc }) => {
                const selected = form.proximosPassos.includes(id);
                return (
                  <button
                    type="button"
                    key={id}
                    onClick={() => togglePasso(id)}
                    aria-pressed={selected}
                    className={`glass group flex flex-col items-center rounded-2xl p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-glow ${
                      selected
                        ? "border-green-500 bg-green-500/15 ring-2 ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)] -translate-y-1"
                        : ""
                    }`}
                  >
                    <div className={`mb-3 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-primary-foreground shadow-glow transition-transform group-hover:scale-110 ${
                      selected ? "bg-green-500" : "bg-gradient-primary"
                    }`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-lg font-bold tracking-wide">{title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FORM CARD */}
          <div className="relative lg:pt-8">
            <div className="absolute -inset-4 bg-gradient-primary opacity-20 blur-3xl" aria-hidden />
            <div className="glass relative rounded-2xl p-8 shadow-card">
              {!done ? (
                <>
                  <div className="mb-6 text-center">
                    <h2 className="font-display text-2xl font-bold">Conta um pouco sobre você.</h2>
                  </div>
                  <form onSubmit={onSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome completo</Label>
                      <Input id="nome" autoComplete="name" placeholder="Seu nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input id="email" type="email" autoComplete="email" placeholder="voce@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">WhatsApp</Label>
                      <Input id="telefone" type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estadoCivil">Estado Civil *</Label>
                      <select
                        id="estadoCivil"
                        value={form.estadoCivil}
                        onChange={(e) => setForm({ ...form, estadoCivil: e.target.value })}
                        required
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Selecione...</option>
                        <option value="solteiro">Solteiro(a)</option>
                        <option value="casado">Casado(a)</option>
                        <option value="divorciado">Divorciado(a)</option>
                        <option value="viuvo">Viúvo(a)</option>
                        <option value="uniao-estavel">União Estável</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>É a sua primeira vez em nossa igreja? *</Label>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {["Sim", "Não"].map((opt) => {
                          const selected = form.primeiraVez === opt;
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => setForm({ ...form, primeiraVez: opt })}
                              aria-pressed={selected}
                              className={`rounded-md border px-3 py-2 text-sm transition-all ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background hover:border-primary/50"
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro *</Label>
                      <Input id="bairro" placeholder="Seu bairro" value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <Input id="cidade" placeholder="Sua cidade" value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} required />
                    </div>

                    <div className="space-y-2">
                      <Label>Quais dias da semana você prefere para participar de um GC? *</Label>
                      <p className="text-xs text-muted-foreground">Pode selecionar mais de um</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {diasSemana.map((dia) => {
                          const selected = form.diasGC.includes(dia);
                          return (
                            <button
                              type="button"
                              key={dia}
                              onClick={() => toggleDia(dia)}
                              aria-pressed={selected}
                              className={`rounded-md border px-3 py-2 text-sm transition-all ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background hover:border-primary/50"
                              }`}
                            >
                              {dia}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Faixa Etária / Idade *</Label>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {faixasEtarias.map((faixa) => {
                          const selected = form.faixaEtaria === faixa;
                          return (
                            <button
                              type="button"
                              key={faixa}
                              onClick={() => setForm({ ...form, faixaEtaria: faixa })}
                              aria-pressed={selected}
                              className={`rounded-md border px-3 py-2 text-sm transition-all ${
                                selected
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-input bg-background hover:border-primary/50"
                              }`}
                            >
                              {faixa}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={loading}
                      className="h-12 w-full bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow transition-transform hover:scale-[1.02]"
                    >
                      {loading ? "Confirmando..." : "Quero meu próximo passo →"}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Seus dados estão seguros. Sem spam.</p>
                  </form>
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                    <CheckCircle2 className="h-9 w-9 text-primary" />
                  </div>
                  <h2 className="font-display text-2xl font-bold">Inscrição confirmada!</h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Em breve entraremos em contato pelo WhatsApp e e-mail.
                  </p>
                  <p className="mt-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                    🎁 Presente liberado! Enviamos um <strong>curso gratuito</strong> para o seu e-mail — confira também a caixa de spam.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} CCVideira Santos Dumont. Todos os direitos reservados.
        </footer>
      </main>
    </div>
  );
}
