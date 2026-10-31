import { describe, expect, it } from 'vitest';
import { analyze } from '../core/engine/analyze';
import { branchAnalysis } from '../core/engine/methods/branch';
import { relationOf } from '../core/engine/topology';
import { mulberry32 } from '../core/engine/generate';
import { byLabel } from '../core/engine/mna';
import { circuitStatus, cortoError, cuaderno5Ix, dosMallas, ej1Ramas, kclAt, kvlTerms, paraleloFuentesI, resistance, serieFuentes, sourceReductions } from '../sim/calc';
import { GENS } from '../sim/content';

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b);

describe('Simulador 2 — casos del cuaderno y del material', () => {
  it('fuente dependiente 5Iₓ: I₁ = 4 A, I₃ = 20 A, I₂ = 24 A, V₀ = 480 V (método de ramas)', () => {
    const a = analyze(cuaderno5Ix());
    expect(a.ok).toBe(true);
    const b = branchAnalysis(a.net, a.topo);
    expect(b.ok).toBe(true);
    expect(rel(b.current.get(a.net.elements.find((e) => e.label === 'R1')!.id)!, 4)).toBeLessThan(1e-9);
    expect(rel(byLabel(a.dc!, 'R2')!.i, 24)).toBeLessThan(1e-9);
    expect(rel(byLabel(a.dc!, 'F')!.i, 20)).toBeLessThan(1e-9);
    expect(rel(byLabel(a.dc!, 'R2')!.v, 480)).toBeLessThan(1e-9);
  });
  it('EJ1 método de ramas: V₀ = −13,58 V', () => {
    const a = analyze(ej1Ramas());
    expect(a.ok).toBe(true);
    expect(byLabel(a.dc!, 'R2')!.v).toBeCloseTo(-13.58, 1);
    expect(branchAnalysis(a.net, a.topo).ok).toBe(true);
  });
});

describe('Simulador 2 — herramientas', () => {
  it('R = ρl/S', () => expect(resistance(0.017, 100, 1)).toBeCloseTo(1.7, 12));
  it('serie y paralelo', () => {
    const a = analyze(dosMallas());
    const id = (l: string) => a.net.elements.find((e) => e.label === l)!.id;
    expect(relationOf(a.net, a.topo, id('E1'), id('R1')).relation).toBe('serie');
    expect(relationOf(a.net, a.topo, id('R2'), id('E2')).relation).toBe('ninguno');
  });
  it('reducción de fuentes: 50 V + 20 V = 70 V y 70 mA − 10 mA = 60 mA', () => {
    const v = sourceReductions(analyze(serieFuentes()));
    expect(Math.abs(v[0].total)).toBeCloseTo(70, 12);
    const i = sourceReductions(analyze(paraleloFuentesI()));
    expect(Math.abs(i[0].total)).toBeCloseTo(0.06, 12);
  });
  it('LCK de un nodo y LVK de una malla cierran', () => {
    const a = analyze(dosMallas());
    for (let n = 0; n < a.net.nodeCount; n++) {
      const k = kclAt(a, n);
      expect(Math.abs(k.sumIn - k.sumOut)).toBeLessThan(1e-9);
    }
    for (const m of a.topo.meshes) expect(Math.abs(kvlTerms(a, m.index).reduce((s, t) => s + t.rise, 0))).toBeLessThan(1e-9);
  });
  it('estado del circuito: cerrado y en corto', () => {
    expect(circuitStatus(analyze(dosMallas())).kind).toBe('cerrado');
    expect(circuitStatus(analyze(cortoError())).kind).not.toBe('cerrado');
  });
  it('ejercicios generados con respuestas finitas', () => {
    const r = mulberry32(3);
    for (const g of GENS)
      for (const l of ['basico', 'intermedio', 'examen'] as const) {
        let ex = g.gen(r, l);
        for (let k = 0; k < 30 && !ex.answers.every((a) => isFinite(a.value)); k++) ex = g.gen(r, l);
        for (const x of ex.answers) expect(isFinite(x.value)).toBe(true);
      }
  });
});
