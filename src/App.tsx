import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CheckCircle2, Circle, ChevronRight, Map, Skull, Trophy, RotateCcw, Play, Pause, Timer, BookOpen, Star, Swords, Shield, X, Edit3, Save } from 'lucide-react';
import { poeData, ActData } from './data';

const loadState = <T,>(key: string, defaultValue: T): T => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const isPassiveQuest = (text: string) => {
  const keywords = [
    "Dweller of the Deep", "Fairgraves", "Blocked Pass", 
    "3 Busts", "Piety (!)", "Deshret's Spirit", 
    "Supplies", "Kitava's Torments", "Sign of Purity", 
    "Tukohama", "Abberath", "Puppet Mistress", 
    "Gruthkul", "Kishara's Star", "Tolman", 
    "Gemling Legionnaires", "Yugul", "Shakari", 
    "Kira & Gurukhan", "Vilenta"
  ];
  return keywords.some(k => text.includes(k));
};

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const dataToText = (data: ActData[]) => {
  return data.map(act => `# ${act.title}\n${act.steps.join('\n')}`).join('\n\n');
};

const textToData = (text: string): ActData[] => {
  const lines = text.split('\n');
  const result: ActData[] = [];
  let currentAct: ActData | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) {
      if (currentAct) result.push(currentAct);
      currentAct = { title: trimmed.substring(2).trim(), steps: [] };
    } else if (currentAct) {
      currentAct.steps.push(trimmed);
    }
  }
  if (currentAct) result.push(currentAct);
  return result;
};

const majorGods = ['Brine King', 'Arakaali', 'Solaris', 'Lunaris'];
const minorGods = ['Abberath', 'Gruthkul', 'Yugul', 'Shakari', 'Tukohama', 'Ralakesh', 'Garukhan', 'Ryslatha'];

export default function App() {
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>(() => loadState('poe-progress', {}));
  const [activeActIndex, setActiveActIndex] = useState(0);
  
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(() => loadState('poe-time', 0));
  const [splits, setSplits] = useState<Record<number, number>>(() => loadState('poe-splits', {}));
  
  const [banditChoice, setBanditChoice] = useState(() => loadState('poe-bandit', 'Kill All'));
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState(() => loadState('poe-notes', ''));
  const [pantheons, setPantheons] = useState<Record<string, boolean>>(() => loadState('poe-pantheons', {}));

  // Custom Route Editor State
  const [customRouteText, setCustomRouteText] = useState(() => loadState('poe-custom-route', ''));
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [editorText, setEditorText] = useState('');

  const activeData = useMemo(() => {
    if (customRouteText) {
      const parsed = textToData(customRouteText);
      if (parsed.length > 0) return parsed;
    }
    return poeData;
  }, [customRouteText]);

  useEffect(() => localStorage.setItem('poe-progress', JSON.stringify(completedSteps)), [completedSteps]);
  useEffect(() => localStorage.setItem('poe-time', JSON.stringify(timeElapsed)), [timeElapsed]);
  useEffect(() => localStorage.setItem('poe-splits', JSON.stringify(splits)), [splits]);
  useEffect(() => localStorage.setItem('poe-bandit', JSON.stringify(banditChoice)), [banditChoice]);
  useEffect(() => localStorage.setItem('poe-notes', JSON.stringify(notes)), [notes]);
  useEffect(() => localStorage.setItem('poe-pantheons', JSON.stringify(pantheons)), [pantheons]);
  useEffect(() => localStorage.setItem('poe-custom-route', JSON.stringify(customRouteText)), [customRouteText]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => setTimeElapsed(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const toggleStep = useCallback((actIndex: number, stepIndex: number) => {
    const key = `${actIndex}-${stepIndex}`;
    setCompletedSteps((prev) => {
      const nextState = { ...prev, [key]: !prev[key] };
      
      // Record split time if act is completed
      if (activeData[actIndex]) {
        const steps = activeData[actIndex].steps;
        const isNowComplete = steps.every((_, j) => nextState[`${actIndex}-${j}`]);
        if (isNowComplete && !prev[key]) {
          setSplits(s => ({ ...s, [actIndex]: timeElapsed }));
        }
      }
      
      return nextState;
    });
  }, [timeElapsed, activeData]);

  const resetProgress = () => {
    if (window.confirm('Are you sure you want to reset all progress? (Notes, Route, and Bandit choice will be kept)')) {
      setCompletedSteps({});
      setActiveActIndex(0);
      setTimeElapsed(0);
      setIsTimerRunning(false);
      setSplits({});
      setPantheons({});
    }
  };

  const openEditor = () => {
    setEditorText(customRouteText || dataToText(poeData));
    setIsEditingRoute(true);
  };

  const saveRoute = () => {
    setCustomRouteText(editorText);
    setIsEditingRoute(false);
  };

  const resetRoute = () => {
    if (window.confirm('Are you sure you want to revert to the default route?')) {
      setCustomRouteText('');
      setEditorText(dataToText(poeData));
    }
  };

  const nextObjective = useMemo(() => {
    for (let i = 0; i < activeData.length; i++) {
      for (let j = 0; j < activeData[i].steps.length; j++) {
        if (!completedSteps[`${i}-${j}`]) {
          return { actIndex: i, stepIndex: j, text: activeData[i].steps[j] };
        }
      }
    }
    return null;
  }, [completedSteps, activeData]);

  // Keyboard shortcut (Space) to toggle next objective
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (nextObjective) {
          toggleStep(nextObjective.actIndex, nextObjective.stepIndex);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextObjective, toggleStep]);

  const calculateActProgress = (actIndex: number) => {
    if (!activeData[actIndex]) return 0;
    const steps = activeData[actIndex].steps;
    if (steps.length === 0) return 0;
    const completed = steps.filter((_, j) => completedSteps[`${actIndex}-${j}`]).length;
    return Math.round((completed / steps.length) * 100);
  };

  // Ensure activeActIndex is valid
  const currentAct = activeData[activeActIndex] || activeData[0];
  const safeActIndex = activeData[activeActIndex] ? activeActIndex : 0;

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      {/* Route Editor Modal */}
      {isEditingRoute && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1d24] border border-white/10 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-amber-500" /> Edit Route
              </h2>
              <button onClick={() => setIsEditingRoute(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-black/20 border-b border-white/5 text-sm text-slate-400">
              <p>Use <strong># Act Name</strong> to create a new section.</p>
              <p>Write each step on a new line. Empty lines are ignored.</p>
              <p className="text-amber-500/80 mt-2 text-xs">Warning: Changing the route structure might misalign your currently checked steps!</p>
            </div>
            <textarea
              value={editorText}
              onChange={(e) => setEditorText(e.target.value)}
              className="flex-1 w-full bg-transparent text-sm text-slate-300 p-4 resize-none focus:outline-none font-mono leading-relaxed"
              spellCheck={false}
            />
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20 rounded-b-2xl">
              <button onClick={resetRoute} className="text-sm text-rose-400 hover:text-rose-300 font-medium px-4 py-2">
                Reset to Default
              </button>
              <div className="flex gap-3">
                <button onClick={() => setIsEditingRoute(false)} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button onClick={saveRoute} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
                  <Save className="w-4 h-4" /> Save Route
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-[#1a1d24] border-b border-white/5 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skull className="w-6 h-6 text-amber-500" />
            <h1 className="text-lg font-semibold tracking-tight text-white hidden sm:block">PoE Progress Checker</h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Timer */}
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-1.5 border border-white/5">
              <Timer className="w-4 h-4 text-amber-500" />
              <span className="font-mono text-sm font-medium w-12 sm:w-16 text-center">{formatTime(timeElapsed)}</span>
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="text-slate-400 hover:text-white ml-1">
                {isTimerRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>

            <button
              onClick={openEditor}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit Route</span>
            </button>

            <button
              onClick={() => setNotesOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">Notes</span>
            </button>

            <button
              onClick={resetProgress}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notes Sidebar */}
      {notesOpen && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-80 bg-[#1a1d24] border-l border-white/5 shadow-2xl z-30 flex flex-col transform transition-transform">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
            <h3 className="font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" /> Build Notes
            </h3>
            <button onClick={() => setNotesOpen(false)} className="text-slate-400 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your gem links, leveling notes, or PoB links here...&#10;&#10;Tip: Press SPACE to quickly check off your next objective!"
            className="flex-1 w-full bg-transparent text-sm text-slate-300 p-4 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed"
          />
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
        {/* Sidebar Navigation */}
        <aside className="space-y-1">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 px-3">Campaign</h2>
          {activeData.map((act, index) => {
            const progress = calculateActProgress(index);
            const isCompleted = progress === 100 && act.steps.length > 0;
            const isActive = safeActIndex === index;

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
                <div className="flex items-center gap-2.5 truncate">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${isActive ? 'border-amber-500' : 'border-slate-600'}`} />
                  )}
                  <span className="truncate">{act.title}</span>
                </div>
                {isCompleted && splits[index] ? (
                  <span className="text-[10px] text-slate-500 font-mono shrink-0 ml-2">{formatTime(splits[index])}</span>
                ) : progress > 0 && progress < 100 ? (
                  <span className="text-[10px] text-slate-500 shrink-0 ml-2">{progress}%</span>
                ) : null}
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
                <p className="text-xs font-bold uppercase tracking-wider text-amber-500 mb-1 flex items-center gap-2">
                  Next Objective
                  <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 hidden sm:inline-block">Press Space</span>
                </p>
                <div className="text-sm text-slate-300">
                  <span className="font-semibold text-white mr-2">{activeData[nextObjective.actIndex].title}:</span>
                  <StepText text={nextObjective.text} />
                </div>
              </div>
              {safeActIndex !== nextObjective.actIndex && (
                <button
                  onClick={() => setActiveActIndex(nextObjective.actIndex)}
                  className="shrink-0 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-sm font-medium rounded-lg transition-colors"
                >
                  Go to Act
                </button>
              )}
            </div>
          )}

          {/* Special UI: Bandit Choice (Act 2) */}
          {currentAct.title.includes('Act 2') && (
            <div className="bg-[#1a1d24] rounded-xl border border-white/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="font-semibold text-white text-sm">Bandit Reward</h3>
                  <p className="text-xs text-slate-400">Select your build's bandit choice</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {['Alira', 'Kraityn', 'Oak', 'Kill All'].map(b => (
                  <button 
                    key={b}
                    onClick={() => setBanditChoice(b)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      banditChoice === b 
                        ? 'bg-amber-500 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]' 
                        : 'bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Special UI: Pantheon Tracker (Mapping) */}
          {currentAct.title.includes('Mapping') && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#1a1d24] rounded-xl border border-white/5 p-5 shadow-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" /> Major Gods
                </h3>
                <div className="space-y-3">
                  {majorGods.map(god => (
                    <label key={god} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white group">
                      <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-600 bg-black/20 group-hover:border-amber-500/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={pantheons[god] || false} 
                          onChange={() => setPantheons(p => ({...p, [god]: !p[god]}))} 
                          className="opacity-0 absolute inset-0 cursor-pointer" 
                        />
                        {pantheons[god] && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      Soul of {god}
                    </label>
                  ))}
                </div>
              </div>
              <div className="bg-[#1a1d24] rounded-xl border border-white/5 p-5 shadow-lg">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-500" /> Minor Gods
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {minorGods.map(god => (
                    <label key={god} className="flex items-center gap-3 text-sm text-slate-300 cursor-pointer hover:text-white group">
                      <div className="relative flex items-center justify-center w-5 h-5 rounded border border-slate-600 bg-black/20 group-hover:border-amber-500/50 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={pantheons[god] || false} 
                          onChange={() => setPantheons(p => ({...p, [god]: !p[god]}))} 
                          className="opacity-0 absolute inset-0 cursor-pointer" 
                        />
                        {pantheons[god] && <CheckCircle2 className="w-3.5 h-3.5 text-amber-500" />}
                      </div>
                      {god}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Current Act Steps */}
          <div className="bg-[#1a1d24] rounded-2xl border border-white/5 overflow-hidden shadow-xl">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  {currentAct.title.includes('Mapping') ? (
                    <Map className="w-6 h-6 text-amber-500" />
                  ) : (
                    <Trophy className="w-6 h-6 text-amber-500" />
                  )}
                  {currentAct.title}
                </h2>
                <div className="mt-4 h-1.5 w-48 sm:w-64 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all duration-500 ease-out"
                    style={{ width: `${calculateActProgress(safeActIndex)}%` }}
                  />
                </div>
              </div>
              
              {/* Act Split Time Display */}
              {splits[safeActIndex] && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Split Time</p>
                  <p className="font-mono text-lg text-emerald-400">{formatTime(splits[safeActIndex])}</p>
                </div>
              )}
            </div>

            <div className="divide-y divide-white/5">
              {currentAct.steps.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-sm">
                  No steps defined for this section.
                </div>
              ) : (
                currentAct.steps.map((step, stepIndex) => {
                  const isCompleted = completedSteps[`${safeActIndex}-${stepIndex}`];
                  const isPassive = isPassiveQuest(step);
                  
                  return (
                    <button
                      key={stepIndex}
                      onClick={() => toggleStep(safeActIndex, stepIndex)}
                      className={`w-full text-left p-4 sm:p-6 flex items-start gap-4 transition-colors hover:bg-white/[0.02] group ${
                        isCompleted ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5 relative">
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <Circle className="w-6 h-6 text-slate-600 group-hover:text-amber-500 transition-colors" />
                        )}
                        {isPassive && !isCompleted && (
                          <Star className="w-3 h-3 text-amber-400 absolute -top-1 -right-1 fill-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                        )}
                      </div>
                      <div className={`flex-1 transition-all ${isCompleted ? 'line-through decoration-slate-600' : ''}`}>
                        <StepText text={step} />
                      </div>
                    </button>
                  );
                })
              )}
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
