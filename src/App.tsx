import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle2, Circle, ChevronRight, Map, Skull, Trophy, RotateCcw } from 'lucide-react';
import { poeData } from './data';

export default function App() {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('poe-progress');
    return saved ? JSON.parse(saved) : {};
  });

  const [activeActIndex, setActiveActIndex] = useState(0);

  useEffect(() => {
    localStorage.setItem('poe-progress', JSON.stringify(completedSteps));
  }, [completedSteps]);

  const toggleStep = (actIndex: number, stepIndex: number) => {
    const key = `${actIndex}-${stepIndex}`;
    setCompletedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress?')) {
      setCompletedSteps({});
      setActiveActIndex(0);
    }
  };

  // Find the next objective
  const nextObjective = useMemo(() => {
    for (let i = 0; i < poeData.length; i++) {
      for (let j = 0; j < poeData[i].steps.length; j++) {
        if (!completedSteps[`${i}-${j}`]) {
          return { actIndex: i, stepIndex: j, text: poeData[i].steps[j] };
        }
      }
    }
    return null;
  }, [completedSteps]);

  // Auto-switch to the act with the next objective when it changes,
  // but only if we just completed the last step of the current act.
  // Actually, a simpler approach is just to let the user navigate, 
  // or provide a "Go to Next Objective" button.

  const calculateActProgress = (actIndex: number) => {
    const steps = poeData[actIndex].steps;
    const completed = steps.filter((_, j) => completedSteps[`${actIndex}-${j}`]).length;
    return Math.round((completed / steps.length) * 100);
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans selection:bg-amber-500/30">
      {/* Header */}
      <header className="bg-[#1a1d24] border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skull className="w-6 h-6 text-amber-500" />
            <h1 className="text-lg font-semibold tracking-tight text-white">PoE Progress Checker</h1>
          </div>
          <button
            onClick={resetProgress}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Navigation */}
        <aside className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-3">Campaign</h2>
          {poeData.map((act, index) => {
            const progress = calculateActProgress(index);
            const isCompleted = progress === 100;
            const isActive = activeActIndex === index;

            return (
              <button
                key={index}
                onClick={() => setActiveActIndex(index)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400'
                    : isCompleted
                    ? 'text-slate-400 hover:bg-white/5'
                    : 'text-slate-200 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 ${isActive ? 'border-amber-500' : 'border-slate-600'}`} />
                  )}
                  {act.title}
                </div>
                {progress > 0 && progress < 100 && (
                  <span className="text-[10px] text-slate-500">{progress}%</span>
                )}
              </button>
            );
          })}
        </aside>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Next Objective Banner */}
          {nextObjective && (
            <div className="bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">Next Objective</p>
                <div className="text-sm text-slate-300">
                  <span className="font-semibold text-white mr-2">{poeData[nextObjective.actIndex].title}:</span>
                  <StepText text={nextObjective.text} />
                </div>
              </div>
              {activeActIndex !== nextObjective.actIndex && (
                <button
                  onClick={() => setActiveActIndex(nextObjective.actIndex)}
                  className="shrink-0 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium rounded-lg transition-colors"
                >
                  Go to Act
                </button>
              )}
            </div>
          )}

          {/* Current Act Steps */}
          <div className="bg-[#1a1d24] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                {poeData[activeActIndex].title === 'Mapping' ? (
                  <Map className="w-6 h-6 text-amber-500" />
                ) : (
                  <Trophy className="w-6 h-6 text-amber-500" />
                )}
                {poeData[activeActIndex].title}
              </h2>
              <div className="mt-4 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${calculateActProgress(activeActIndex)}%` }}
                />
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {poeData[activeActIndex].steps.map((step, stepIndex) => {
                const isCompleted = completedSteps[`${activeActIndex}-${stepIndex}`];
                
                return (
                  <button
                    key={stepIndex}
                    onClick={() => toggleStep(activeActIndex, stepIndex)}
                    className={`w-full text-left p-4 sm:p-6 flex items-start gap-4 transition-colors hover:bg-white/[0.02] group ${
                      isCompleted ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <Circle className="w-6 h-6 text-slate-600 group-hover:text-amber-500 transition-colors" />
                      )}
                    </div>
                    <div className={`flex-1 transition-all ${isCompleted ? 'line-through decoration-slate-600' : ''}`}>
                      <StepText text={step} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const StepText = ({ text }: { text: string }) => {
  const parts = text.split(/\s+-\s+|\s+->\s+/);
  
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm md:text-base leading-relaxed">
      {parts.map((part, index) => {
        let className = "text-slate-300";
        
        // Highlight specific keywords
        if (part.includes("WP")) className = "text-blue-400 font-semibold";
        else if (part.includes("Trial")) className = "text-emerald-400 font-semibold";
        else if (part.includes("DC/TP")) className = "text-rose-400 font-semibold";
        else if (part.includes("(!)")) className = "text-amber-400 font-semibold";
        else if (part.match(/\([NSEW]\)|\([NS][EW]\)/)) className = "text-slate-400"; // Directions like (N), (SE)
        
        return (
          <React.Fragment key={index}>
            <span className={className}>{part}</span>
            {index < parts.length - 1 && (
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
