// Datas de nascimento trafegam como "AAAA-MM-DD" e são lidas pelos componentes,
// sem passar por Date/UTC, para não errar o dia por causa de fuso horário.

function partes(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [a, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(a, mes - 1, dia);
  if (d.getFullYear() !== a || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
  return { a, mes, dia };
}

export function dataNascimentoValida(iso: string, hoje = new Date()) {
  const p = partes(iso);
  if (!p || p.a < 1900) return false;
  const idade = calcularIdade(iso, hoje);
  return idade !== null && idade >= 0 && idade <= 120;
}

/** Idade completa hoje: só soma o ano depois que o aniversário deste ano chegou. */
export function calcularIdade(iso: string, hoje = new Date()) {
  const p = partes(iso);
  if (!p) return null;
  const mesHoje = hoje.getMonth() + 1;
  const jaFezAniversario = mesHoje > p.mes || (mesHoje === p.mes && hoje.getDate() >= p.dia);
  return hoje.getFullYear() - p.a - (jaFezAniversario ? 0 : 1);
}

export function ehAniversarioHoje(iso: string, hoje = new Date()) {
  const p = partes(iso);
  return !!p && p.mes === hoje.getMonth() + 1 && p.dia === hoje.getDate();
}

export function formatarData(iso: string) {
  const p = partes(iso);
  return p ? `${String(p.dia).padStart(2, "0")}/${String(p.mes).padStart(2, "0")}/${p.a}` : iso;
}

export function hojeIso(hoje = new Date()) {
  const m = String(hoje.getMonth() + 1).padStart(2, "0");
  const d = String(hoje.getDate()).padStart(2, "0");
  return `${hoje.getFullYear()}-${m}-${d}`;
}
