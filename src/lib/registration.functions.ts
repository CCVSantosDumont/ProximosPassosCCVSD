import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const registrationSchema = z
  .object({
    nome: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(255),
    telefone: z.string().trim().min(10).max(20),
    estadoCivil: z.string().min(1).max(50),
    bairro: z.string().trim().min(2).max(100),
    cidade: z.string().trim().min(2).max(100),
    primeiraVez: z.enum(["Sim", "Não"]),
    proximosPassos: z.array(z.enum(["abencoar", "gc", "curso", "servir"])).min(1),
    diasGC: z.array(z.enum(["Segunda", "Terça", "Sexta", "Sábado"])),
    faixaEtaria: z.enum(["8-11", "12-14", "15-17", "18-24", "25-35", "36+"]),
  })
  .refine((d) => !d.proximosPassos.includes("gc") || d.diasGC.length > 0, {
    message: "Escolha pelo menos um dia para o GC",
    path: ["diasGC"],
  });

const PASSO_LABELS = {
  abencoar: "Abençoar",
  gc: "Conhecer um GC",
  curso: "Iniciar um Curso",
  servir: "Servir",
} as const;

const SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbxUPwJHvHZbEZK8_MdnwpqgXIkmSj4uwzVm7g5yZLlvqjU6q1DcbST_lLgB9FRpumN_TA/exec";
const COURSE_URL =
  "https://comunidadecristavideira.eadplataforma.app/curso/fundamentos-fe-2020-05-13-15-10-51";
const SENDER_EMAIL = "siidneysolano17@gmail.com";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendBrevoEmail(
  apiKey: string,
  message: {
    to: Array<{ email: string; name?: string }>;
    subject: string;
    htmlContent: string;
    textContent: string;
  },
) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: "CCVideira Santos Dumont", email: SENDER_EMAIL },
      ...message,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Brevo request failed [${response.status}]: ${errorBody}`);
    throw new Error(`Não foi possível enviar o e-mail pelo Brevo [${response.status}].`);
  }
}

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((data) => registrationSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["BREVO_API_KEY"];
    if (!apiKey) {
      throw new Error("BREVO_API_KEY não está configurada.");
    }

    const passos = data.proximosPassos;
    const payload = {
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      whatsapp: data.telefone,
      estadoCivil: data.estadoCivil,
      bairro: data.bairro,
      cidade: data.cidade,
      primeiraVez: data.primeiraVez,
      // Chaves antigas mantidas para não quebrar o Apps Script da planilha:
      // decidir = Abençoar, conectar = Conhecer um GC, conhecer = Iniciar um Curso
      decidir: passos.includes("abencoar") ? "Sim" : "Não",
      conectar: passos.includes("gc") ? "Sim" : "Não",
      conhecer: passos.includes("curso") ? "Sim" : "Não",
      servir: passos.includes("servir") ? "Sim" : "Não",
      diasGC: data.diasGC,
      faixaEtaria: data.faixaEtaria,
      data: new Date().toISOString(),
    };

    const sheetsResponse = await fetch(SHEETS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!sheetsResponse.ok) {
      const errorBody = await sheetsResponse.text();
      console.error(`Google Sheets request failed [${sheetsResponse.status}]: ${errorBody}`);
      throw new Error("Não foi possível salvar a inscrição na planilha.");
    }

    const safeName = escapeHtml(data.nome);
    const courseHtml = `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
        <h2>Olá, ${safeName}!</h2>
        <p>Obrigado por dar o seu próximo passo com a gente.</p>
        <p>Como prometido, aqui está o seu <strong>curso gratuito</strong>:</p>
        <p style="margin:28px 0"><a href="${COURSE_URL}" style="background:#222;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none">Acessar meu curso gratuito</a></p>
        <p>Em breve nossa equipe entrará em contato pelo WhatsApp.</p>
        <p>Com carinho,<br><strong>CCVideira Santos Dumont</strong></p>
      </div>`;

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:620px;color:#222">
        <h2>Novo cadastro na Landing Page</h2>
        <p><strong>Nome:</strong> ${safeName}</p>
        <p><strong>E-mail:</strong> ${escapeHtml(data.email)}</p>
        <p><strong>WhatsApp:</strong> ${escapeHtml(data.telefone)}</p>
        <p><strong>Estado civil:</strong> ${escapeHtml(data.estadoCivil)}</p>
        <p><strong>Bairro:</strong> ${escapeHtml(data.bairro)}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(data.cidade)}</p>
        <p><strong>Primeira vez:</strong> ${data.primeiraVez}</p>
        <p><strong>Próximos passos:</strong> ${data.proximosPassos.map((p) => PASSO_LABELS[p]).join(", ")}</p>
        <p><strong>Dias de GC:</strong> ${data.diasGC.join(", ") || "—"}</p>
        <p><strong>Faixa etária:</strong> ${data.faixaEtaria}</p>
      </div>`;

    await Promise.all([
      sendBrevoEmail(apiKey, {
        to: [{ email: data.email, name: data.nome }],
        subject: "Seu presente chegou — CCVideira Santos Dumont",
        textContent: `Olá, ${data.nome}! Acesse seu curso gratuito: ${COURSE_URL}`,
        htmlContent: courseHtml,
      }),
      sendBrevoEmail(apiKey, {
        to: [{ email: SENDER_EMAIL, name: "CCVideira Santos Dumont" }],
        subject: `Novo cadastro na Landing Page — ${data.nome}`,
        textContent: `Novo cadastro: ${data.nome} | ${data.email} | ${data.telefone}`,
        htmlContent: adminHtml,
      }),
    ]);

    return { ok: true };
  });
