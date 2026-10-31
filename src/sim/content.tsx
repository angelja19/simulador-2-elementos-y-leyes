import React from 'react';
import { analyze } from '../core/engine/analyze';
import { pick, randomGridCircuit, randR, randV, Rng } from '../core/engine/generate';
import { branchAnalysis } from '../core/engine/methods/branch';
import { texNum, texQ } from '../core/engine/units';
import { Tex } from '../core/ui/basic';
import { CircuitPreview } from '../core/ui/CircuitPreview';
import { ExerciseGen, LearnSection, Level } from '../core/ui/Practice';
import { BOX, P, T } from '../core/ui/panels';
import { cuaderno5Ix, dosMallas, ej1Ramas, MATERIALS, paraleloFuentesI, serieFuentes } from './calc';

export const LEARN: LearnSection[] = [
  {
    title: '2.1 Circuito eléctrico',
    body: <p>Es toda <b>trayectoria cerrada</b> donde, partiendo de un punto, se llega al mismo punto luego de recorrer un camino cualquiera. Sin trayectoria cerrada no hay corriente (circuito <b>abierto</b>); si una fuente queda unida por un cable sin carga, está <b>en corto</b>.</p>,
  },
  {
    title: '2.2 Serie y paralelo',
    body: (
      <>
        <p><b>Serie:</b> un solo camino, la misma corriente: <Tex tex="I = I_1 = I_2" />, <Tex tex="E = V_1 + V_2" />, <Tex tex="P = P_1 + P_2" />.</p>
        <p><b>Paralelo:</b> mismos dos nodos, el mismo voltaje: <Tex tex="E = V_1 = V_2" />, <Tex tex="I = I_1 + I_2" />, <Tex tex="P = P_1 + P_2" />.</p>
        <CircuitPreview circuit={dosMallas()} height={200} />
        <p className="small">En la figura, R1 y E1 están en serie; R2 no está en paralelo con E2 porque R3 los separa.</p>
      </>
    ),
  },
  {
    title: '2.3 Nodo, malla, rama',
    body: (
      <>
        <p><b>Nodo:</b> punto de unión de dos o más elementos. <b>Nodo principal</b> («con pedigree»): llegan 3 o más ramas. <b>Rama:</b> trayectoria que une dos nodos principales. <b>Malla:</b> trayectoria cerrada que no contiene otras (las «ventanas» del dibujo).</p>
        <Tex block tex="l = b - n + 1" />
        <p>l = mallas, b = ramas, n = nodos principales.</p>
      </>
    ),
  },
  {
    title: '2.4 Fuentes independientes y dependientes',
    body: (
      <>
        <p><b>Independientes</b> (círculo): su valor no depende de nada del circuito. <b>Dependientes</b> (rombo): su valor es k·(un voltaje o corriente de otra parte del circuito).</p>
        <ul>
          <li>VCVS: <Tex tex="v = \mu\,v_x" /> (μ adimensional)</li>
          <li>VCCS: <Tex tex="i = g\,v_x" /> (g en S)</li>
          <li>CCVS: <Tex tex="v = r\,i_x" /> (r en Ω)</li>
          <li>CCCS: <Tex tex="i = \beta\,i_x" /> (β adimensional)</li>
        </ul>
      </>
    ),
  },
  {
    title: '2.5–2.6 Conexión y reducción de fuentes',
    body: (
      <>
        <ul>
          <li>Fuentes de <b>voltaje en serie</b>: siempre; se reducen sumando o restando.</li>
          <li>Fuentes de <b>voltaje en paralelo</b>: SOLO si son de igual valor (si no, viola la LVK).</li>
          <li>Fuentes de <b>corriente en serie</b>: SOLO si son de igual valor (si no, viola la LCK).</li>
          <li>Fuentes de <b>corriente en paralelo</b>: siempre; se reducen sumando o restando.</li>
        </ul>
        <div className="grid2">
          <CircuitPreview circuit={serieFuentes()} height={180} />
          <CircuitPreview circuit={paraleloFuentesI()} height={180} />
        </div>
      </>
    ),
  },
  {
    title: '2.7 Resistencia',
    body: (
      <>
        <Tex block tex="R = \rho\,\frac{l}{S}\quad [\Omega],\qquad \rho\ [\Omega\cdot\text{mm}^2/\text{m}],\ l\ [\text{m}],\ S\ [\text{mm}^2]" />
        <p>Depende del material, la temperatura y las dimensiones. Conductancia: <Tex tex="G = 1/R" /> [S]. Cobre: ρ ≈ {MATERIALS[1].rho} Ω·mm²/m.</p>
      </>
    ),
  },
  {
    title: '2.8 Ley de Ohm',
    body: (
      <p>
        <Tex tex="V = R\times I" /> (en clase: <Tex tex="E = R\cdot I" />). La curva I–V de una resistencia es una recta de pendiente 1/R.
      </p>
    ),
  },
  {
    title: '2.9–2.10 Leyes de Kirchhoff',
    body: (
      <>
        <p><b>LVK:</b> en toda malla, la suma algebraica de voltajes es cero, <Tex tex="\sum V_i = 0" />. Recorriendo en sentido horario: <b>de − a + suma</b>, <b>de + a − resta</b>.</p>
        <p><b>LCK:</b> «agüita que entra, agüita que sale»: <Tex tex="\sum I_{entran} = \sum I_{salen}" />.</p>
        <p><b>Polaridades:</b> en una resistencia, + por donde entra la corriente; en una fuente de voltaje, la corriente sale por el +; en una fuente de corriente, criterio del agua (de mayor a menor altura).</p>
      </>
    ),
  },
  {
    title: '2.11 Método de corrientes de rama',
    body: (
      <ol>
        <li>Determinar las ramas y asignarles corrientes I₁, I_A…</li>
        <li>Marcar polaridades según la convención.</li>
        <li>LVK en cada malla y LCK en cada nodo con pedigree (menos uno).</li>
        <li>Resolver: siempre hay tantas ecuaciones como incógnitas. Luego calcular voltajes y potencias.</li>
      </ol>
    ),
  },
];

export const GLOSSARY = [
  { term: 'Nodo principal', def: 'Nodo al que llegan tres o más ramas (con «pedigree»).' },
  { term: 'Rama', def: 'Trayectoria entre dos nodos principales; todos sus elementos llevan la misma corriente.' },
  { term: 'Malla', def: 'Lazo que no contiene otros lazos en su interior (ventana del dibujo).' },
  { term: 'Lazo', def: 'Cualquier trayectoria cerrada.' },
  { term: 'Árbol', def: 'Conjunto de ramas que une todos los nodos sin formar lazos; las demás son el co-árbol.' },
  { term: 'Fuente dependiente', def: 'Fuente (rombo) cuyo valor depende de otra variable del circuito.' },
  { term: 'Conductancia', def: 'G = 1/R, en siemens [S].' },
  { term: 'Resistividad', def: 'ρ, propiedad del material: Ω·mm²/m o Ω·m.' },
];

const lv = (l: Level, a: number, b: number, c: number) => (l === 'basico' ? a : l === 'intermedio' ? b : c);

export const GENS: ExerciseGen[] = [
  {
    id: 'Resistencia de un cable',
    subtopic: '2.7 Resistencia',
    gen: (r) => {
      const m = pick(r, MATERIALS.slice(0, 6));
      const l = pick(r, [10, 25, 50, 100, 250]);
      const S = pick(r, [0.5, 1, 1.5, 2.5, 4, 6]);
      const R = (m.rho * l) / S;
      return {
        prompt: `Un cable de ${m.name.toLowerCase()} (ρ = ${String(m.rho).replace('.', ',')} Ω·mm²/m) mide $${l}$ m y su sección es $${texNum(S)}$ mm². Halle R y G.`,
        answers: [{ label: 'R', value: R, unit: 'Ω' }, { label: 'G', value: 1 / R, unit: 'S' }],
        hints: ['$R = \\rho l/S$', '$G = 1/R$'],
        solution: [T(`R = \\frac{${texNum(m.rho)}\\cdot${l}}{${texNum(S)}} = ${texQ(R, 'Ω')}`), T(`G = ${texQ(1 / R, 'S')}`)],
      };
    },
  },
  {
    id: 'Ley de Ohm',
    subtopic: '2.8 Ley de Ohm',
    gen: (r) => {
      const V = randV(r);
      const R = randR(r);
      return { prompt: `Una resistencia de $${R}$ Ω está conectada a $${V}$ V. Halle I y P.`, answers: [{ label: 'I', value: V / R, unit: 'A' }, { label: 'P', value: (V * V) / R, unit: 'W' }], hints: ['$I = V/R$', '$P = V^2/R$'], solution: [T(`I = ${V}/${R} = ${texQ(V / R, 'A')},\\quad P = ${texQ((V * V) / R, 'W')}`)] };
    },
  },
  {
    id: 'LCK: corriente desconocida',
    subtopic: '2.9 Kirchhoff',
    gen: (r) => {
      const ins = [pick(r, [2, 3, 5]), pick(r, [1, 4, 6])];
      const out1 = pick(r, [1, 2, 3]);
      const x = ins[0] + ins[1] - out1;
      return { prompt: `A un nodo entran $${ins[0]}$ A y $${ins[1]}$ A, y sale $${out1}$ A por una rama. ¿Cuánto sale por la otra rama?`, answers: [{ label: 'I_x', value: x, unit: 'A' }], hints: ['Agüita que entra = agüita que sale.'], solution: [T(`${ins[0]} + ${ins[1]} = ${out1} + I_x \\Rightarrow I_x = ${x}\\ [A]`)] };
    },
  },
  {
    id: 'LVK: voltaje desconocido',
    subtopic: '2.9 Kirchhoff',
    gen: (r) => {
      const E = pick(r, [12, 24, 30, 48]);
      const v1 = pick(r, [3, 5, 8]);
      const v2 = pick(r, [2, 4, 6]);
      return { prompt: `En una malla con una fuente de $${E}$ V y tres resistencias en serie, dos de ellas tienen $${v1}$ V y $${v2}$ V. ¿Cuál es el voltaje de la tercera?`, answers: [{ label: 'V_3', value: E - v1 - v2, unit: 'V' }], hints: ['$\\sum V = 0$: la fuente sube E y las resistencias bajan.'], solution: [T(`${E} - ${v1} - ${v2} - V_3 = 0 \\Rightarrow V_3 = ${E - v1 - v2}\\ [V]`)] };
    },
  },
  {
    id: 'Reducción de fuentes',
    subtopic: '2.5 Fuentes',
    gen: (r) => {
      const a = pick(r, [10, 20, 30, 50]);
      const b = pick(r, [5, 10, 20]);
      const aid = r() < 0.5;
      return { prompt: `Dos fuentes de voltaje de $${a}$ V y $${b}$ V están en serie ${aid ? 'con la misma polaridad (+ con −)' : 'en oposición (+ con +)'}. ¿Cuál es la fuente equivalente?`, answers: [{ label: 'E_{eq}', value: aid ? a + b : Math.abs(a - b), unit: 'V' }], hints: ['En serie se suman con su signo.'], solution: [T(`E_{eq} = ${a} ${aid ? '+' : '-'} ${b} = ${aid ? a + b : a - b}\\ [V]`)] };
    },
  },
  {
    id: 'Topología: contar mallas',
    subtopic: '2.3 Topología',
    gen: (r, l) => {
      const c = randomGridCircuit(r, { cols: lv(l, 2, 3, 3), rows: lv(l, 1, 1, 2), vSources: 1, iSources: 0 });
      const a = analyze(c);
      return { prompt: 'Cuente los nodos principales, las ramas y las mallas del circuito.', circuit: c, answers: [{ label: 'n', value: a.topo.principalNodes.length, unit: 'nodos', tol: 0 }, { label: 'b', value: a.topo.branches.length, unit: 'ramas', tol: 0 }, { label: 'l', value: a.topo.meshes.length, unit: 'mallas', tol: 0 }], hints: ['Nodo principal: llegan 3 o más elementos.', '$l = b - n + 1$'], solution: [P(`n = ${a.topo.principalNodes.length}, b = ${a.topo.branches.length}, l = ${a.topo.meshes.length}`)] };
    },
  },
  {
    id: 'Método de ramas',
    subtopic: '2.11 Corrientes de rama',
    gen: (r, l) => {
      const c = randomGridCircuit(r, { cols: 2, rows: 1, vSources: lv(l, 1, 2, 1), iSources: lv(l, 0, 0, 1), dependent: l === 'examen' });
      const a = analyze(c);
      const R = a.net.elements.filter((e) => e.kind === 'R');
      const tgt = pick(r, R);
      const x = a.dc!.el.get(tgt.id)!;
      const br = branchAnalysis(a.net, a.topo);
      return {
        prompt: `Resuelva por corrientes de rama y halle el valor de la corriente por ${tgt.label} (en valor absoluto) y su potencia (una resistencia siempre absorbe: P > 0).`,
        circuit: c,
        answers: [{ label: `|I_{${tgt.label}}|`, value: Math.abs(x.i), unit: 'A' }, { label: `P_{${tgt.label}}`, value: x.p, unit: 'W' }],
        hints: ['Asigne una corriente por rama y escriba una LVK por malla.', 'Agregue una LCK en un nodo principal.'],
        solution: [...br.eqs.map((e) => T(e.raw, `(${e.n})`)), BOX(`|I_{${tgt.label}}| = ${texQ(Math.abs(x.i), 'A')},\\ P = ${texQ(x.p, 'W')}`)],
      };
    },
  },
];

export const TEMPLATES = [
  { name: 'Cuaderno: fuente dependiente 5Iₓ', desc: 'LVK 500 − 5I₁ − 20I₂ = 0; LCK I₁ + I₃ = I₂; I₃ = 5I₁ ⇒ I₁ = 4 A, I₃ = 20 A, I₂ = 24 A, V₀ = 480 V.', circuit: cuaderno5Ix },
  { name: 'EJ1 método de ramas (6Iₓ y 20 mA)', desc: 'Del archivo «EJ1 MET DE RAMA»: V₀ = −13,58 V.', circuit: ej1Ramas },
  { name: 'Dos mallas con dos fuentes', desc: 'Circuito clásico para LVK + LCK.', circuit: dosMallas },
  { name: 'Fuentes de voltaje en serie (50 V + 20 V)', desc: 'Se reducen a 70 V.', circuit: serieFuentes },
  { name: 'Fuentes de corriente en paralelo (70 mA y 10 mA opuestas)', desc: 'Se reducen a 60 mA.', circuit: paraleloFuentesI },
];
export type T2 = (typeof TEMPLATES)[number];

