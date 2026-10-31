import React from 'react';
import { Shell } from './core/ui/basic';
import { sendTemplate } from './core/ui/DCMode';
import { LearnView, PracticeView } from './core/ui/Practice';
import { AnalyzeMode, OhmMode, ResistenciaMode } from './sim/modes';
import { GENS, GLOSSARY, LEARN, TEMPLATES } from './sim/content';
import { CircuitPreview } from './core/ui/CircuitPreview';

export default function App() {
  return (
    <Shell
      number={2}
      title="Elementos y Leyes Principales sobre Circuitos"
      modes={[
        { id: 'analizar', title: 'Armar y analizar (2.1–2.6, 2.9–2.11)', render: () => <AnalyzeMode /> },
        { id: 'resistencia', title: '2.7 Resistencia R = ρl/S', render: () => <ResistenciaMode /> },
        { id: 'ohm', title: '2.8 Ley de Ohm', render: () => <OhmMode /> },
      ]}
      learn={<LearnView sections={LEARN} glossary={GLOSSARY} />}
      practice={<PracticeView gens={GENS} storageKey="sim2" />}
      templates={() => (
        <div className="grid2">
          {TEMPLATES.map((t, i) => (
            <div key={i} className="card">
              <b>{t.name}</b>
              <p className="small">{t.desc}</p>
              <CircuitPreview circuit={t.circuit()} height={150} showNodes={false} />
              <button className="primary" onClick={() => sendTemplate('u2-analizar', t.circuit(), 'analizar')}>
                Cargar en la ventanilla 1
              </button>
            </div>
          ))}
        </div>
      )}
    />
  );
}
