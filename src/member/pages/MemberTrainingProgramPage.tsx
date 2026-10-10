import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, User, Dumbbell, AlertCircle, ChevronDown } from 'lucide-react';
import { memberApiClient } from '../api/client';
import type {
  MemberTrainingProgram,
  MemberTrainingProgramDay,
  MemberExercise
} from '../api/validators';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr || typeof dateStr !== 'string') return '—';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return '—';
  const [, year, month, day] = match;
  return `${day}.${month}.${year}`;
}

interface ExerciseCardProps {
  exercise: MemberExercise;
}

function ExerciseCard({ exercise }: ExerciseCardProps) {
  return (
    <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium text-base mb-1">
          {exercise.exercise_name}
        </div>
        {exercise.instructions && (
          <p className="text-white/60 text-sm whitespace-pre-wrap break-words leading-relaxed">
            {exercise.instructions}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2.5 sm:justify-end shrink-0">
        {exercise.sets !== null && (
          <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
            <div className="text-[10px] text-white/40 uppercase font-medium tracking-wider mb-0.5">
              Set
            </div>
            <div className="text-white font-semibold text-sm">{exercise.sets}</div>
          </div>
        )}
        {exercise.repetitions && (
          <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
            <div className="text-[10px] text-white/40 uppercase font-medium tracking-wider mb-0.5">
              Tekrar
            </div>
            <div className="text-white font-semibold text-sm">{exercise.repetitions}</div>
          </div>
        )}
        {exercise.duration_seconds !== null && (
          <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
            <div className="text-[10px] text-white/40 uppercase font-medium tracking-wider mb-0.5">
              Süre
            </div>
            <div className="text-white font-semibold text-sm">{exercise.duration_seconds}s</div>
          </div>
        )}
        {exercise.rest_seconds !== null && (
          <div className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 text-center min-w-16">
            <div className="text-[10px] text-white/40 uppercase font-medium tracking-wider mb-0.5">
              Dinlenme
            </div>
            <div className="text-white font-semibold text-sm">{exercise.rest_seconds}s</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProgramDaySectionProps {
  day: MemberTrainingProgramDay;
  defaultOpen?: boolean;
}

function ProgramDaySection({ day, defaultOpen = false }: ProgramDaySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentId = `program-day-content-${day.id}`;
  const headerButtonId = `program-day-header-${day.id}`;

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden bg-black/20">
      <button
        id={headerButtonId}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls={contentId}
        className={`w-full min-h-[44px] px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
          isOpen ? 'border-b border-white/10' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-[#851C35] shrink-0" />
          <h4 className="text-white font-medium text-sm sm:text-base truncate">
            {day.title}
          </h4>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs text-white/40 font-mono">
            {day.exercises.length} egzersiz
          </span>
          <ChevronDown
            className={`w-4 h-4 text-white/50 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            aria-hidden="true"
          />
        </div>
      </button>

      {isOpen && (
        <div id={contentId} role="region" aria-labelledby={headerButtonId}>
          {day.exercises.length > 0 ? (
            <div className="divide-y divide-white/5">
              {day.exercises.map((ex) => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-white/40 text-xs sm:text-sm">
              Bu güne henüz egzersiz eklenmemiş.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function MemberTrainingProgramPage() {
  const [programs, setPrograms] = useState<MemberTrainingProgram[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const isMountedRef = useRef(true);

  const fetchPrograms = useCallback(async () => {
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const generation = ++requestGenerationRef.current;

    setLoading(true);
    setError('');

    try {
      const data = await memberApiClient.getTrainingPrograms(controller.signal);

      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }

      setPrograms(data);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (!isMountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }
      setError('Antrenman programları yüklenemedi.');
    } finally {
      if (isMountedRef.current && generation === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPrograms();

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, [fetchPrograms]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Programım</h1>
        <p className="text-sm text-white/60 mt-1">
          Antrenörünün senin için hazırladığı antrenman programları.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-6 text-center">
          <div className="flex justify-center mb-2">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            type="button"
            onClick={fetchPrograms}
            className="min-h-[44px] px-5 py-2.5 bg-[#851C35] hover:bg-[#851C35]/90 text-white text-sm font-medium rounded-lg transition-colors inline-flex items-center justify-center cursor-pointer"
          >
            Tekrar Dene
          </button>
        </div>
      ) : loading ? (
        <div className="space-y-6">
          {[1, 2].map((skeletonId) => (
            <div
              key={skeletonId}
              className="rounded-2xl border border-white/10 bg-[#121212] p-5 sm:p-6 space-y-4 animate-pulse"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-3 pb-4 border-b border-white/5">
                <div className="space-y-2">
                  <div className="h-6 w-48 bg-white/10 rounded" />
                  <div className="h-4 w-36 bg-white/5 rounded" />
                </div>
                <div className="h-4 w-40 bg-white/5 rounded" />
              </div>
              <div className="space-y-3 pt-2">
                <div className="h-10 w-full bg-white/5 rounded-xl" />
                <div className="h-16 w-full bg-white/5 rounded-xl" />
                <div className="h-16 w-full bg-white/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : programs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#121212] p-8 text-center text-white/50 text-sm">
          <Dumbbell className="w-10 h-10 text-white/20 mx-auto mb-3" />
          Aktif antrenman programın bulunmuyor.
        </div>
      ) : (
        <div className="space-y-6">
          {programs.map((prog) => {
            const hasDays = prog.days.length > 0;
            const hasUnassigned = prog.unassigned_exercises.length > 0;
            const hasAnyExercises =
              prog.days.some((d) => d.exercises.length > 0) || hasUnassigned;

            // Default open: first day containing exercises, otherwise the first day
            const firstDayWithExercises = prog.days.find((d) => d.exercises.length > 0);
            const initialOpenDayId = firstDayWithExercises
              ? firstDayWithExercises.id
              : hasDays
              ? prog.days[0].id
              : null;

            return (
              <div
                key={prog.id}
                className="bg-[#121212] border border-white/10 rounded-2xl overflow-hidden shadow-sm"
              >
                {/* Program Header */}
                <div className="p-5 sm:p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-white font-semibold text-xl tracking-tight mb-2">
                      {prog.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-sm text-white/60">
                      <span className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-white/40" />
                        {prog.trainer ? (
                          <>
                            <span className="text-white/80 font-medium">{prog.trainer.name}</span>
                            {prog.trainer.role_title && (
                              <span className="text-xs text-white/40">({prog.trainer.role_title})</span>
                            )}
                          </>
                        ) : (
                          <span>Antrenörsüz</span>
                        )}
                      </span>
                      <span className="text-white/20">•</span>
                      <span className="flex items-center gap-1.5 font-mono text-xs text-white/50">
                        <Calendar className="w-3.5 h-3.5 text-white/40" />
                        {formatDate(prog.start_date)} - {formatDate(prog.end_date)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Program Content */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Empty state when program has zero total exercises */}
                  {!hasAnyExercises && (
                    <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] text-center text-white/40 text-sm">
                      Bu programa henüz egzersiz eklenmemiş.
                    </div>
                  )}

                  {hasDays && (
                    <div className="space-y-4">
                      {prog.days.map((day) => (
                        <ProgramDaySection
                          key={day.id}
                          day={day}
                          defaultOpen={day.id === initialOpenDayId}
                        />
                      ))}
                    </div>
                  )}

                  {/* Unassigned / Legacy Exercises */}
                  {hasUnassigned && (
                    <div className="border border-amber-500/20 rounded-xl overflow-hidden bg-black/20">
                      <div className="px-4 py-3 bg-amber-500/[0.04] border-b border-amber-500/20 flex items-center justify-between gap-3">
                        <div>
                          <h4 className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            Gün Atanmamış Egzersizler
                          </h4>
                          <p className="text-xs text-white/50 mt-0.5">
                            Belirli bir güne atanmamış egzersizler.
                          </p>
                        </div>
                        <span className="text-xs text-amber-400/80 font-mono">
                          {prog.unassigned_exercises.length} egzersiz
                        </span>
                      </div>
                      <div className="divide-y divide-white/5">
                        {prog.unassigned_exercises.map((ex) => (
                          <ExerciseCard key={ex.id} exercise={ex} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
