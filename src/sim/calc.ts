// Cálculos propios del Simulador 2.
import { Analysis } from '../core/engine/analyze';
import { cb } from '../core/engine/builder';
import { Circuit, NetElement } from '../core/engine/types';
import { fmtNum, texNum } from '../core/engine/units';

/**
 * Resistividades típicas a 20 °C en Ω·mm²/m (= 10⁻⁶ Ω·m).
 * Fuente: Serway & Jewett, «Física para ciencias e ingeniería», tabla de resistividades (27.2),
 * y Boylestad, «Introducción al análisis de circuitos», cap. 3. Las aleaciones varían según su composición.
 */
export const MATERIALS: { name: string; rho: number; note?: string }[] = [
  { name: 'Plata', rho: 0.0159 },
  { name: 'Cobre', rho: 0.017 },
  { name: 'Oro', rho: 0.0244 },
  { name: 'Aluminio', rho: 0.0282 },
  { name: 'Tungsteno', rho: 0.056 },
  { name: 'Hierro', rho: 0.1 },
  { name: 'Platino', rho: 0.11 },
  { name: 'Plomo', rho: 0.22 },
  { name: 'Nicromo', rho: 1.5, note: 'aleación: 1,0 a 1,5 según composición' },
  { name: 'Carbono (grafito)', rho: 35, note: 'varía mucho con la pureza' },
];

/** R = ρ·l/S con ρ en Ω·mm²/m, l en m, S en mm² */
export function resistance(rho: number, l: number, S: number) {
  return (rho * l) / S;
}
export const rhoToSI = (rhoMm: number) => rhoMm * 1e-6; // Ω·m
export const areaFromDiameter = (dmm: number) => (Math.PI * dmm * dmm) / 4; // mm²

export interface SourceReduction {
  kind: 'V' | 'I';
  members: { label: string; value: number; sign: number }[];
  total: number;
  tex: string;
  where: string;
}

/** Fuentes de voltaje en serie (misma rama) y de corriente en paralelo (mismo par de nodos) */
export function sourceReductions(a: Analysis): SourceReduction[] {
  const out: SourceReduction[] = [];
  const byId = new Map(a.net.elements.map((e) => [e.id, e]));
  for (const br of a.topo.branches) {
    let node = br.from;
    const vs: { e: NetElement; s: number }[] = [];
    for (const id of br.elements) {
      const e = byId.get(id)!;
      const s = e.n1 === node ? 1 : -1;
      if (e.kind === 'V') vs.push({ e, s });
      node = e.n1 === node ? e.n2 : e.n1;
    }
    if (vs.length >= 2) {
      // tomar la polaridad de la primera como referencia
      const ref = vs[0].s;
      const members = vs.map((x) => ({ label: x.e.label, value: x.e.value, sign: x.s === ref ? 1 : -1 }));
      const total = members.reduce((t, m) => t + m.sign * m.value, 0);
      out.push({ kind: 'V', members, total, tex: `E_{eq} = ${members.map((m, i) => `${m.sign < 0 ? '-' : i ? '+' : ''} ${m.label}`).join(' ')} = ${members.map((m, i) => `${m.sign < 0 ? '-' : i ? '+' : ''} ${texNum(m.value)}`).join(' ')} = ${texNum(total)}\\ [V]`, where: `rama ${br.elements.map((id) => byId.get(id)!.label).join('–')}` });
    }
  }
  const groups = new Map<string, NetElement[]>();
  for (const e of a.net.elements.filter((x) => x.kind === 'I')) {
    const k = [Math.min(e.n1, e.n2), Math.max(e.n1, e.n2)].join('-');
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(e);
  }
  for (const [, g] of groups) {
    if (g.length < 2) continue;
    const ref = g[0];
    const members = g.map((e) => ({ label: e.label, value: e.value, sign: e.n1 === ref.n1 ? 1 : -1 }));
    const total = members.reduce((t, m) => t + m.sign * m.value, 0);
    out.push({ kind: 'I', members, total, tex: `I_{eq} = ${members.map((m, i) => `${m.sign < 0 ? '-' : i ? '+' : ''} ${m.label}`).join(' ')} = ${texNum(total)}\\ [A]`, where: `entre los nodos ${a.net.nodeNames[ref.n1]} y ${a.net.nodeNames[ref.n2]}` });
  }
  return out;
}

/** LCK de un nodo con valores: corrientes que entran y que salen */
export function kclAt(a: Analysis, n: number) {
  const ins: { label: string; i: number }[] = [];
  const outs: { label: string; i: number }[] = [];
  for (const e of a.net.elements) {
    if (e.n1 === e.n2) continue;
    const r = a.dc!.el.get(e.id)!;
    // corriente a→b dentro del elemento: sale del nodo a, entra al nodo b
    let leaving = 0;
    if (e.n1 === n) leaving = r.i;
    else if (e.n2 === n) leaving = -r.i;
    else continue;
    if (Math.abs(leaving) < 1e-15) continue;
    if (leaving > 0) outs.push({ label: e.label, i: leaving });
    else ins.push({ label: e.label, i: -leaving });
  }
  return { ins, outs, sumIn: ins.reduce((s, x) => s + x.i, 0), sumOut: outs.reduce((s, x) => s + x.i, 0) };
}

/** Términos de la LVK de una malla al estilo del curso (de − a + suma; de + a − resta) */
export function kvlTerms(a: Analysis, mesh: number) {
  const m = a.topo.meshes.find((x) => x.index === mesh);
  if (!m) return [];
  return m.items.map((it) => {
    const e = a.net.elements.find((x) => x.id === it.id)!;
    const r = a.dc!.el.get(e.id)!;
    // caída en el sentido del recorrido = dir·v_ab ; el curso suma las subidas
    const drop = it.dir * r.v;
    return { id: e.id, label: e.label, rise: -drop, text: drop > 0 ? `de + a − (−${fmtNum(Math.abs(drop), 4)} V)` : `de − a + (+${fmtNum(Math.abs(drop), 4)} V)` };
  });
}

export function circuitStatus(a: Analysis): { kind: 'cerrado' | 'abierto' | 'corto' | 'otro'; text: string } {
  const codes = a.issues.filter((i) => i.severity === 'error').map((i) => i.code);
  if (codes.includes('vcorto') || codes.includes('lparalelo')) return { kind: 'corto', text: 'EN CORTO: una fuente de voltaje quedó cortocircuitada.' };
  if (codes.includes('abierto') || codes.includes('suelto') || codes.includes('iabierto') || codes.includes('aislado')) return { kind: 'abierto', text: 'ABIERTO: no hay una trayectoria cerrada para la corriente.' };
  if (a.ok) return { kind: 'cerrado', text: 'CERRADO: existe al menos una trayectoria cerrada y circula corriente.' };
  return { kind: 'otro', text: 'Revise los errores del panel.' };
}

// -------------------- plantillas --------------------
/** Cuaderno: fuente dependiente 5Iₓ. LVK 500 − 5I₁ − 20I₂ = 0; 20I₂ − V₀ = 0; LCK I₁ + I₃ = I₂; I₃ = 5I₁ */
export function cuaderno5Ix(): Circuit {
  const b = cb();
  b.el('V', 'E', '500', [0, 0], [0, 8]);
  b.el('R', 'R1', '5', [0, 0], [10, 0], { id: 'r5', varName: 'Iₓ' });
  b.el('R', 'R2', '20', [10, 0], [10, 8], { varName: 'V₀' });
  b.wire([10, 0], [20, 0]);
  b.el('CCCS', 'F', '5', [20, 8], [20, 0], { ctrlRef: 'r5' });
  b.wire([0, 8], [20, 8]);
  b.gnd([0, 8]);
  return b.build();
}
/** EJ1 método de ramas (archivo «EJ1 MET DE RAMA.pdf»): V₀ = −13,58 V */
export function ej1Ramas(): Circuit {
  const b = cb();
  b.el('V', 'E', '5', [0, 0], [0, 8]);
  b.el('R', 'R1', '1k', [0, 0], [8, 0]);
  b.el('R', 'R2', '17k', [8, 0], [8, 8], { varName: 'V₀' });
  b.el('CCVS', 'H', '6', [8, 0], [16, 0], { ctrlRef: 'r22' });
  b.el('R', 'R3', '22k', [16, 0], [16, 8], { id: 'r22', varName: 'Iₓ' });
  b.wire([16, 0], [24, 0]);
  b.el('I', 'Is', '20m', [24, 0], [24, 8]);
  b.wire([0, 8], [24, 8]);
  b.gnd([0, 8]);
  return b.build();
}
export function serieFuentes(): Circuit {
  const b = cb();
  b.el('V', 'E1', '50', [0, 0], [0, 8]);
  b.el('V', 'E2', '20', [0, 8], [0, 16]);
  b.el('R', 'R1', '10', [0, 0], [10, 0]);
  b.el('R', 'R2', '25', [10, 0], [10, 16]);
  b.wire([0, 16], [10, 16]);
  b.gnd([0, 16]);
  return b.build();
}
export function paraleloFuentesI(): Circuit {
  const b = cb();
  b.el('I', 'I1', '70m', [0, 8], [0, 0]);
  b.el('I', 'I2', '10m', [8, 0], [8, 8]);
  b.el('R', 'R1', '1k', [16, 0], [16, 8]);
  b.wire([0, 0], [16, 0]);
  b.wire([0, 8], [16, 8]);
  b.gnd([0, 8]);
  return b.build();
}
export function dosMallas(): Circuit {
  const b = cb();
  b.el('V', 'E1', '12', [0, 0], [0, 8]);
  b.el('R', 'R1', '4', [0, 0], [8, 0]);
  b.el('R', 'R2', '6', [8, 0], [8, 8]);
  b.el('R', 'R3', '2', [8, 0], [16, 0]);
  b.el('V', 'E2', '6', [16, 0], [16, 8]);
  b.wire([0, 8], [16, 8]);
  b.gnd([0, 8]);
  return b.build();
}
export function vccsEjemplo(): Circuit {
  const b = cb();
  b.el('V', 'E', '10', [0, 0], [0, 8]);
  b.el('R', 'R1', '2', [0, 0], [8, 0]);
  b.el('R', 'R2', '4', [8, 0], [8, 8], { id: 'r2', varName: 'Vx' });
  b.wire([8, 0], [16, 0]);
  b.el('VCCS', 'G1', '0.5', [16, 0], [16, 8], { ctrlRef: 'r2' });
  b.wire([0, 8], [16, 8]);
  b.gnd([0, 8]);
  return b.build();
}
export function cortoError(): Circuit {
  const b = cb();
  b.el('V', 'E1', '10', [0, 0], [0, 8]);
  b.el('V', 'E2', '12', [8, 0], [8, 8]);
  b.wire([0, 0], [8, 0]);
  b.wire([0, 8], [8, 8]);
  b.el('R', 'R1', '5', [8, 0], [16, 0]);
  b.wire([16, 0], [16, 8], [8, 8]);
  b.gnd([0, 8]);
  return b.build();
}
