import React, { useEffect, useMemo, useState } from 'react';
import { Analysis } from '../core/engine/analyze';
import { relationOf } from '../core/engine/topology';
import { fmtEng, fmtNum, parseSI, texNum, texQ } from '../core/engine/units';
import { Kpi, Plot, Tex, ThreePanels, usePreset } from '../core/ui/basic';
import { DCMode, Tabs } from '../core/ui/DCMode';
import { PickMode } from '../core/ui/CircuitEditor';
import { BetterDoc, BetterView, BOX, L, P, StepDoc, StepsView, T } from '../core/ui/panels';
import { areaFromDiameter, circuitStatus, dosMallas, kclAt, kvlTerms, MATERIALS, resistance, rhoToSI, sourceReductions } from './calc';
import { isDependent } from '../core/engine/types';

type ToolId = 'estado' | 'sp' | 'topo' | 'lck' | 'lvk' | 'fuentes';

export function AnalyzeMode() {
  const [tool, setTool] = useState<ToolId>('estado');
  const [pair, setPair] = useState<string[]>([]);
  const [node, setNode] = useState<number | null>(null);
  const [mesh, setMesh] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [aRef, setARef] = useState<Analysis | null>(null);
  useEffect(() => {
    if (!playing) return;
    const n = mesh && aRef ? aRef.topo.meshes.find((m) => m.index === mesh)?.items.length ?? 0 : 0;
    const id = setInterval(() => setStep((s) => (s + 1 > n ? (setPlaying(false), n) : s + 1)), 550);
    return () => clearInterval(id);
  }, [playing, mesh, aRef]);
  const pick: PickMode =
    tool === 'sp'
      ? { kind: 'element', count: 2, prompt: 'Toque dos elementos para saber si están en serie o en paralelo', onPick: (ids) => setPair(ids as string[]) }
      : tool === 'lck'
        ? { kind: 'node', count: 1, prompt: 'Toque un nodo para ver su LCK', onPick: (ids) => setNode(ids[0] as number) }
        : tool === 'lvk'
          ? { kind: 'mesh', count: 1, prompt: 'Toque el rótulo I₁, I₂… de una malla para recorrerla', onPick: (ids) => { setMesh(ids[0] as number); setStep(0); setPlaying(true); } }
          : null;
  const pickMemo = useMemo(() => pick, [tool]);
  return (
    <DCMode
      storageKey="u2-analizar"
      palette={['R', 'G', 'V', 'I', 'VCVS', 'VCCS', 'CCVS', 'CCCS', 'AM', 'VM', 'GND']}
      initial={dosMallas()}
      methods={['ramas', 'nodos', 'mallas']}
      defaultMethod="ramas"
      pick={pickMemo}
      editorProps={{
        showMeshes: tool === 'lvk' || tool === 'topo',
        highlightMesh: tool === 'lvk' ? mesh : null,
        highlightIds:
          tool === 'sp'
            ? pair
            : tool === 'lvk' && mesh && aRef
              ? (aRef.topo.meshes.find((m) => m.index === mesh)?.items.slice(0, step).map((x) => x.id) ?? [])
              : tool === 'lck' && node !== null && aRef
                ? aRef.net.elements.filter((e) => e.n1 === node || e.n2 === node).map((e) => e.id)
                : [],
        highlightNodes: tool === 'topo' && aRef ? aRef.topo.principalNodes : tool === 'lck' && node !== null ? [node] : [],
      }}
      p1Extra={(a) => {
        if (aRef !== a) setTimeout(() => setARef(a), 0);
        return (
          <div className="card">
            <h4>Herramientas de análisis</h4>
            <Tabs
              value={tool}
              onChange={setTool}
              items={[
                { id: 'estado', label: 'Cerrado / abierto / corto' },
                { id: 'sp', label: 'Serie o paralelo' },
                { id: 'topo', label: 'Topología' },
                { id: 'lck', label: 'LCK en un nodo' },
                { id: 'lvk', label: 'LVK en una malla' },
                { id: 'fuentes', label: 'Reducción de fuentes' },
              ]}
            />
            {tool === 'estado' && <Status a={a} />}
            {tool === 'sp' && <SeriesParallel a={a} pair={pair} />}
            {tool === 'topo' && <Topo a={a} />}
            {tool === 'lck' && <KCLView a={a} node={node} />}
            {tool === 'lvk' && <KVLView a={a} mesh={mesh} step={step} onReplay={() => { setStep(0); setPlaying(true); }} />}
            {tool === 'fuentes' && <Sources a={a} />}
          </div>
        );
      }}
    />
  );
}

function Status({ a }: { a: Analysis }) {
  const s = circuitStatus(a);
  return (
    <div className={`issue ${s.kind === 'cerrado' ? 'box-ok' : 'box-err'}`}>
      <b>Circuito {s.text}</b>
      <p className="small">Concepto (U2, 2.1): circuito es toda trayectoria cerrada donde, partiendo de un punto, se llega al mismo punto luego de recorrer un camino cualquiera.</p>
    </div>
  );
}

function SeriesParallel({ a, pair }: { a: Analysis; pair: string[] }) {
  if (pair.length < 2) return <p className="hint">Toque dos elementos del dibujo.</p>;
  const r = relationOf(a.net, a.topo, pair[0], pair[1]);
  const A = a.net.elements.find((e) => e.id === pair[0]);
  const B = a.net.elements.find((e) => e.id === pair[1]);
  const ra = a.dc?.el.get(pair[0]);
  const rb = a.dc?.el.get(pair[1]);
  return (
    <div>
      <div className={`issue ${r.relation === 'ninguno' ? 'box-warn' : 'box-ok'}`}>
        <b>
          {A?.label} y {B?.label}: {r.relation === 'serie' ? 'EN SERIE' : r.relation === 'paralelo' ? 'EN PARALELO' : r.relation === 'mismo' ? 'mismo elemento' : 'NI SERIE NI PARALELO'}
        </b>
        <p className="small">{r.reason}</p>
      </div>
      {ra && rb && (
        <table className="data">
          <thead>
            <tr>
              <th></th>
              <th>{A?.label}</th>
              <th>{B?.label}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Corriente |I|</td>
              <td>{fmtEng(Math.abs(ra.i), 'A', 5)}</td>
              <td>{fmtEng(Math.abs(rb.i), 'A', 5)}</td>
            </tr>
            <tr>
              <td>Voltaje |V|</td>
              <td>{fmtEng(Math.abs(ra.v), 'V', 5)}</td>
              <td>{fmtEng(Math.abs(rb.v), 'V', 5)}</td>
            </tr>
          </tbody>
        </table>
      )}
      <p className="hint">{r.relation === 'serie' ? 'En serie: I = I₁ = I₂ (la misma corriente).' : r.relation === 'paralelo' ? 'En paralelo: E = V₁ = V₂ (el mismo voltaje).' : ''}</p>
    </div>
  );
}

function Topo({ a }: { a: Analysis }) {
  const t = a.topo;
  const n = Math.max(1, t.principalNodes.length);
  return (
    <div>
      <Kpi
        items={[
          { l: 'Nodos (todos)', v: t.nodes },
          { l: 'Nodos principales', v: t.principalNodes.length },
          { l: 'Ramas (b)', v: t.branches.length },
          { l: 'Mallas (l)', v: t.meshes.length },
          { l: 'Lazos independientes', v: t.independentLoops },
        ]}
      />
      <Tex block tex={`l = b - n + 1 = ${t.branches.length} - ${n} + 1 = ${t.branches.length - n + 1}\\quad ${t.branches.length - n + 1 === t.meshes.length ? '\\checkmark' : '\\times'}`} />
      <ul className="small">
        {t.branches.map((b, i) => (
          <li key={i}>
            Rama {i + 1}: {b.elements.map((id) => a.net.elements.find((e) => e.id === id)!.label).join(' – ')}
          </li>
        ))}
      </ul>
      <p className="hint">Los nodos principales («con pedigree») se resaltan en el dibujo: llegan 3 o más ramas. Árbol: {t.tree.length} elementos; co‑árbol (cuerdas): {t.cotree.length} = lazos independientes.</p>
    </div>
  );
}

function KCLView({ a, node }: { a: Analysis; node: number | null }) {
  if (node === null) return <p className="hint">Toque un nodo (círculo) en el dibujo.</p>;
  if (!a.dc) return <p>Corrija los errores para ver valores.</p>;
  const k = kclAt(a, node);
  const name = node === 0 ? 'de referencia' : a.net.nodeNames[node];
  return (
    <div>
      <p>
        Nodo <b>{name}</b> — «agüita que entra, agüita que sale»:
      </p>
      <Tex block tex={`${k.ins.map((x) => `I_{${x.label}}`).join(' + ') || '0'} = ${k.outs.map((x) => `I_{${x.label}}`).join(' + ') || '0'}`} />
      <Tex block tex={`${k.ins.map((x) => texNum(x.i, 4)).join(' + ') || '0'} = ${k.outs.map((x) => texNum(x.i, 4)).join(' + ') || '0'} \\;\\Rightarrow\\; ${texNum(k.sumIn, 5)} = ${texNum(k.sumOut, 5)}\\ [A]\\ \\checkmark`} />
      <p className="hint">Entran: {k.ins.map((x) => `${x.label} (${fmtEng(x.i, 'A', 4)})`).join(', ') || '—'} · Salen: {k.outs.map((x) => `${x.label} (${fmtEng(x.i, 'A', 4)})`).join(', ') || '—'}</p>
    </div>
  );
}

function KVLView({ a, mesh, step, onReplay }: { a: Analysis; mesh: number | null; step: number; onReplay: () => void }) {
  if (mesh === null) return <p className="hint">Toque el rótulo I₁, I₂… de una malla en el dibujo.</p>;
  if (!a.dc) return <p>Corrija los errores para ver valores.</p>;
  const terms = kvlTerms(a, mesh);
  const shown = terms.slice(0, step);
  const sum = shown.reduce((s, t) => s + t.rise, 0);
  return (
    <div>
      <p>
        Recorriendo la malla {mesh} en sentido horario. Signos del curso: <b>de − a + suma (+)</b>, <b>de + a − resta (−)</b>.
      </p>
      <Tex block tex={`${shown.map((t, i) => `${t.rise >= 0 ? (i ? '+' : '') : '-'} V_{${t.label}}`).join(' ') || '\\;'}${step >= terms.length ? ' = 0' : '\\;\\dots'}`} />
      <Tex block tex={`${shown.map((t, i) => `${t.rise >= 0 ? (i ? '+' : '') : '-'} ${texNum(Math.abs(t.rise), 4)}`).join(' ') || '\\;'} ${step >= terms.length ? `= ${texNum(sum, 3)}\\ \\checkmark` : ''}`} />
      <ol className="small">
        {shown.map((t) => (
          <li key={t.id}>
            {t.label}: {t.text}
          </li>
        ))}
      </ol>
      <button onClick={onReplay}>↻ Repetir animación</button>
    </div>
  );
}

function Sources({ a }: { a: Analysis }) {
  const red = sourceReductions(a);
  return (
    <div>
      {!red.length && <p className="hint">No hay fuentes de voltaje en serie (misma rama) ni fuentes de corriente en paralelo (mismo par de nodos) para reducir.</p>}
      {red.map((r, i) => (
        <div key={i} className="card">
          <b>{r.kind === 'V' ? 'Fuentes de voltaje en serie' : 'Fuentes de corriente en paralelo'}</b> ({r.where})
          <Tex block tex={r.tex} />
        </div>
      ))}
      <p className="small">Reglas (U2, 2.5 y 2.6): V en serie siempre (se suman con su signo); V en paralelo SOLO si son iguales. I en paralelo siempre (se suman); I en serie SOLO si son iguales. Las combinaciones prohibidas aparecen en el panel de errores.</p>
    </div>
  );
}

// ---------------- Resistencia R = ρ l / S ----------------
export function ResistenciaMode() {
  const [s, set] = usePreset('u2-rho', { mat: 'Cobre', rho: '0,017', l: '100', S: '2,5', useD: false, d: '1,78' });
  const rho = parseSI(s.rho);
  const l = parseSI(s.l, 'm');
  const S = s.useD ? (parseSI(s.d).ok ? { ok: true, value: areaFromDiameter(parseSI(s.d).value!) } : parseSI(s.d)) : parseSI(s.S);
  const errs: string[] = [];
  if (!rho.ok) errs.push(`ρ: ${rho.error}`);
  else if (rho.value! <= 0) errs.push('ρ debe ser positiva.');
  if (!l.ok) errs.push(`l: ${l.error}`);
  else if (l.value! <= 0) errs.push('La longitud debe ser positiva.');
  if (!S.ok) errs.push(`Sección: ${(S as any).error}`);
  else if (S.value! <= 0) errs.push('La sección S debe ser mayor que cero (S = 0 sería una resistencia infinita).');
  const R = errs.length ? NaN : resistance(rho.value!, l.value!, S.value!);
  const G = 1 / R;
  const p1 = (
    <div className="col">
      <label className="row">
        Material
        <select
          value={s.mat}
          onChange={(e) => {
            const m = MATERIALS.find((x) => x.name === e.target.value);
            set({ ...s, mat: e.target.value, rho: m ? String(m.rho).replace('.', ',') : s.rho });
          }}
        >
          {MATERIALS.map((m) => (
            <option key={m.name}>{m.name}</option>
          ))}
          <option value="otro">otro (escriba ρ)</option>
        </select>
      </label>
      <div className="grid2">
        <label className="row">
          ρ [Ω·mm²/m]
          <input value={s.rho} onChange={(e) => set({ ...s, rho: e.target.value, mat: 'otro' })} style={{ width: 90 }} aria-label="resistividad" />
        </label>
        <label className="row">
          l [m]
          <input value={s.l} onChange={(e) => set({ ...s, l: e.target.value })} style={{ width: 90 }} aria-label="longitud" />
        </label>
        <label className="row">
          <input type="checkbox" checked={s.useD} onChange={(e) => set({ ...s, useD: e.target.checked })} /> dar el diámetro
        </label>
        {s.useD ? (
          <label className="row">
            d [mm]
            <input value={s.d} onChange={(e) => set({ ...s, d: e.target.value })} style={{ width: 90 }} />
          </label>
        ) : (
          <label className="row">
            S [mm²]
            <input value={s.S} onChange={(e) => set({ ...s, S: e.target.value })} style={{ width: 90 }} aria-label="sección" />
          </label>
        )}
      </div>
      {errs.length > 0 && <div className="issue box-err">{errs.join(' ')}</div>}
      {!errs.length && (
        <>
          <Kpi items={[{ l: 'Resistencia R', v: fmtEng(R, 'Ω', 5) }, { l: 'Conductancia G = 1/R', v: fmtEng(G, 'S', 5) }, { l: 'ρ en Ω·m', v: `${fmtNum(rhoToSI(rho.value!), 4)} Ω·m` }, { l: 'Sección S', v: `${fmtNum(S.value!, 5)} mm²` }]} />
          <h4>Curva I–V (ley de Ohm)</h4>
          <Plot series={[{ label: `I = V/R (R = ${fmtEng(R, 'Ω', 3)})`, x: [0, 1, 2, 3, 4, 5].map((k) => k), y: [0, 1, 2, 3, 4, 5].map((k) => k / R) }]} xLabel="V [V]" yLabel="I [A]" height={200} />
        </>
      )}
      <details>
        <summary>Tabla de resistividades a 20 °C (Ω·mm²/m)</summary>
        <table className="data">
          <tbody>
            {MATERIALS.map((m) => (
              <tr key={m.name}>
                <td>{m.name}</td>
                <td>{fmtNum(m.rho, 4)}</td>
                <td className="small">{m.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">Fuente: Serway & Jewett, «Física para ciencias e ingeniería» (tabla de resistividades) y Boylestad, cap. 3. 1 Ω·mm²/m = 10⁻⁶ Ω·m.</p>
      </details>
    </div>
  );
  const doc: StepDoc | null = errs.length
    ? null
    : {
        title: 'Resistencia de un conductor',
        concept: 'La resistencia es la oposición del material a la corriente; depende del material (ρ), de su longitud y de su sección: $R = \\rho\\,l/S$. Más largo → más resistencia; más grueso → menos.',
        identification: [L([`Material: ${s.mat}, $\\rho = ${texNum(rho.value!)}\\ \\Omega\\cdot\\text{mm}^2/\\text{m}$`, `$l = ${texQ(l.value!, 'm')}$`, s.useD ? `$d = ${s.d}$ mm ⇒ $S = \\pi d^2/4 = ${texNum(S.value!, 5)}$ mm²` : `$S = ${texNum(S.value!, 5)}$ mm²`])],
        laws: [T('R = \\frac{\\rho\\, l}{S}\\quad [\\Omega] = \\frac{[\\Omega\\cdot\\text{mm}^2/\\text{m}]\\,[\\text{m}]}{[\\text{mm}^2]},\\qquad G = \\frac{1}{R}\\ [S]')],
        development: [T(`R = \\frac{${texNum(rho.value!)}\\cdot ${texNum(l.value!)}}{${texNum(S.value!, 5)}} = ${texQ(R, 'Ω', 5)}`, '(1)'), T(`G = \\frac{1}{${texNum(R, 5)}} = ${texQ(G, 'S', 5)}`, '(2)')],
        results: [BOX(`R = ${texQ(R, 'Ω', 5)}`), BOX(`G = ${texQ(G, 'S', 5)}`)],
        verification: [P(`En unidades SI: $\\rho = ${texNum(rhoToSI(rho.value!), 4)}\\ \\Omega\\cdot m$, $S = ${texNum(S.value! * 1e-6, 4)}\\ m^2$ ⇒ $R = ${texNum((rhoToSI(rho.value!) * l.value!) / (S.value! * 1e-6), 5)}\\ \\Omega$ ✓ (mismo resultado).`)],
        tip: 'Use ρ en Ω·mm²/m con S en mm² y l en m: así no hay que convertir potencias de 10. El cobre ≈ 0,017: 100 m de cable de 1 mm² ≈ 1,7 Ω.',
      };
  const better: BetterDoc = {
    method: 'Fórmula con unidades prácticas (Ω·mm²/m)',
    why: 'Los cables se venden por su sección en mm²; usar ρ en Ω·mm²/m evita convertir.',
    savings: 'Ninguna conversión de potencias de 10.',
    formulas: [{ tex: 'R = \\rho\\,\\frac{l}{S}', meaning: 'Resistencia del conductor.' }, { tex: 'S = \\frac{\\pi d^2}{4}', meaning: 'Sección circular a partir del diámetro.' }, { tex: 'G = 1/R', meaning: 'Conductancia en siemens.' }],
    tricks: ['Duplicar la longitud duplica R; duplicar la sección la reduce a la mitad.', 'Si el diámetro se duplica, S se cuadruplica y R baja a ¼.'],
    mistakes: ['Usar ρ en Ω·m con S en mm² (error de 10⁶).', 'Usar el diámetro en lugar de la sección.'],
    compare: { long: 'Pasar todo a SI (Ω·m, m²) y calcular.', short: 'ρ [Ω·mm²/m] × l [m] / S [mm²].', result: errs.length ? '—' : `$R = ${texQ(R, 'Ω', 5)}$.` },
  };
  return <ThreePanels titles={['Datos', 'Solución', 'Cómo resolverlo de una mejor manera']} p1={p1} p2={doc ? <StepsView doc={doc} /> : <div className="card box-err">Corrija los datos en la ventanilla 1.</div>} p3={<BetterView doc={better} />} />;
}

// ---------------- Ley de Ohm ----------------
export function OhmMode() {
  const [s, set] = usePreset('u2-ohm', { V: '12', R: '4', solve: 'I' as 'I' | 'V' | 'R', I: '3' });
  const V = parseSI(s.V, 'V');
  const R = parseSI(s.R, 'Ω');
  const I = parseSI(s.I, 'A');
  const errs: string[] = [];
  if (s.solve !== 'V' && !V.ok) errs.push(`V: ${V.error}`);
  if (s.solve !== 'R' && !R.ok) errs.push(`R: ${R.error}`);
  if (s.solve !== 'I' && !I.ok) errs.push(`I: ${I.error}`);
  if (!errs.length && s.solve !== 'R' && R.value! === 0) errs.push('R = 0 es un cortocircuito: la corriente sería infinita.');
  if (!errs.length && s.solve !== 'R' && R.value! < 0) errs.push('Una resistencia negativa no existe en un elemento pasivo: escriba un valor positivo.');
  if (!errs.length && s.solve === 'R' && I.value === 0) errs.push('Con I = 0 la resistencia sería infinita (circuito abierto).');
  const res = errs.length ? null : s.solve === 'I' ? { V: V.value!, R: R.value!, I: V.value! / R.value! } : s.solve === 'V' ? { V: R.value! * I.value!, R: R.value!, I: I.value! } : { V: V.value!, R: V.value! / I.value!, I: I.value! };
  const p1 = (
    <div className="col">
      <div className="row">
        <span>Calcular:</span>
        {(['I', 'V', 'R'] as const).map((k) => (
          <button key={k} className={s.solve === k ? 'active' : ''} onClick={() => set({ ...s, solve: k })}>
            {k}
          </button>
        ))}
      </div>
      <div className="row">
        {s.solve !== 'V' && (
          <label className="row">
            V [V] <input value={s.V} onChange={(e) => set({ ...s, V: e.target.value })} style={{ width: 80 }} aria-label="voltaje" />
          </label>
        )}
        {s.solve !== 'R' && (
          <label className="row">
            R [Ω] <input value={s.R} onChange={(e) => set({ ...s, R: e.target.value })} style={{ width: 80 }} aria-label="resistencia" />
          </label>
        )}
        {s.solve !== 'I' && (
          <label className="row">
            I [A] <input value={s.I} onChange={(e) => set({ ...s, I: e.target.value })} style={{ width: 80 }} aria-label="corriente" />
          </label>
        )}
      </div>
      {s.solve === 'I' && R.ok && R.value! > 0 && (
        <label className="row">
          Mover V: <input type="range" min={0} max={50} step={0.5} value={V.ok ? V.value! : 0} onChange={(e) => set({ ...s, V: e.target.value })} style={{ flex: 1 }} />
        </label>
      )}
      {errs.length > 0 && <div className="issue box-err">{errs.join(' ')}</div>}
      {res && (
        <>
          <Kpi items={[{ l: 'V', v: fmtEng(res.V, 'V', 5) }, { l: 'R', v: fmtEng(res.R, 'Ω', 5) }, { l: 'I', v: fmtEng(res.I, 'A', 5) }, { l: 'P = V·I', v: fmtEng(res.V * res.I, 'W', 5) }]} />
          <Plot
            series={[{ label: `recta I = V/R`, x: [0, Math.max(1, Math.abs(res.V) * 1.5)], y: [0, Math.max(1, Math.abs(res.V) * 1.5) / res.R] }]}
            points={[{ x: res.V, y: res.I }]}
            xLabel="V [V]"
            yLabel="I [A]"
            height={220}
          />
        </>
      )}
    </div>
  );
  const doc: StepDoc | null = res
    ? {
        title: 'Ley de Ohm',
        concept: 'Si a un conductor de resistencia R se le aplica una d.d.p., esta es igual a la resistencia por la corriente que circula: $V = R\\times I$ (en clase, $E = R\\cdot I$).',
        identification: [L([s.solve !== 'V' ? `$V = ${texQ(res.V, 'V')}$` : 'incógnita V', s.solve !== 'R' ? `$R = ${texQ(res.R, 'Ω')}$` : 'incógnita R', s.solve !== 'I' ? `$I = ${texQ(res.I, 'A')}$` : 'incógnita I'])],
        laws: [T('V = R\\times I')],
        development: [s.solve === 'I' ? T(`I = \\frac{V}{R} = \\frac{${texNum(res.V)}}{${texNum(res.R)}} = ${texQ(res.I, 'A', 5)}`, '(1)') : s.solve === 'V' ? T(`V = R\\,I = ${texNum(res.R)}\\cdot ${texNum(res.I)} = ${texQ(res.V, 'V', 5)}`, '(1)') : T(`R = \\frac{V}{I} = \\frac{${texNum(res.V)}}{${texNum(res.I)}} = ${texQ(res.R, 'Ω', 5)}`, '(1)'), T(`P = V\\,I = ${texQ(res.V * res.I, 'W', 5)}\\ (\\text{absorbe})`, '(2)')],
        results: [BOX(s.solve === 'I' ? `I = ${texQ(res.I, 'A', 5)}` : s.solve === 'V' ? `V = ${texQ(res.V, 'V', 5)}` : `R = ${texQ(res.R, 'Ω', 5)}`)],
        verification: [P(`$R\\cdot I = ${texNum(res.R * res.I, 6)} = V$ ✓; la pendiente de la recta I–V es $1/R = G = ${texNum(1 / res.R, 5)}$ S ✓.`)],
        tip: 'Con prefijos: V en voltios, R en kΩ → I sale en mA directamente.',
      }
    : null;
  const better: BetterDoc = {
    method: 'Triángulo V = R·I',
    why: 'Tape la incógnita: V arriba, R e I abajo.',
    savings: 'Despeje inmediato.',
    formulas: [{ tex: 'V = R\\,I,\\quad I = V/R,\\quad R = V/I', meaning: 'Las tres formas de la ley de Ohm.' }, { tex: 'P = V I = R I^2 = V^2/R', meaning: 'Potencia en la resistencia.' }],
    tricks: ['V [V] / R [kΩ] = I [mA].', 'Doble de V ⇒ doble de I (relación lineal).'],
    mistakes: ['Dividir R/V.', 'Olvidar los prefijos (kΩ, mA).'],
    compare: { long: 'Plantear LVK del circuito.', short: 'Aplicar Ohm directamente al elemento.', result: res ? `$I = ${texQ(res.I, 'A', 5)}$.` : '—' },
  };
  return <ThreePanels titles={['Datos', 'Solución', 'Cómo resolverlo de una mejor manera']} p1={p1} p2={doc ? <StepsView doc={doc} /> : <div className="card box-err">Corrija los datos en la ventanilla 1.</div>} p3={<BetterView doc={better} />} />;
}

export { isDependent };
