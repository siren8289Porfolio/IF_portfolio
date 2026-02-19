import React, { useEffect, useState } from 'react';
import { Page, Assessment } from '@/shared/types/appTypes';
import { motion } from 'motion/react';
import { AlertTriangle, Info, Send, Briefcase, MapPin, Clock, Calendar, AlignLeft, Plus } from 'lucide-react';
import { getRiskDetail } from '@/shared/api/assessments';

interface RiskResultProps {
  onNavigate: (page: Page) => void;
  assessment: Partial<Assessment>;
  onSave?: (status?: string) => void;
}

export function RiskResult({ onNavigate, assessment, onSave }: RiskResultProps) {
  const [score, setScore] = useState(assessment.riskScore || 0);
  const [level, setLevel] = useState<Assessment['riskLevel']>(assessment.riskLevel || 'Low');
  const [factorTexts, setFactorTexts] = useState<string[]>(assessment.riskFactors || []);
  const [summary, setSummary] = useState<string | null>(null);
  const [guidance, setGuidance] = useState<string | null>(null);
  const [disclaimer, setDisclaimer] = useState<string | null>(null);

  const jobMatches = assessment.jobMatches || [];
  const isCompleted = assessment.status === 'Completed' || assessment.status === 'Matched';

  useEffect(() => {
    const id = assessment.id ? Number(assessment.id) : NaN;
    if (!assessment.id || Number.isNaN(id)) {
      return;
    }
    let cancelled = false;

    const load = async () => {
      try {
        const detail = await getRiskDetail(id);
        if (cancelled) return;
        setScore(detail.riskScore ?? 0);
        const newLevel: Assessment['riskLevel'] =
          detail.riskGrade === 'HIGH' ? 'High' :
          detail.riskGrade === 'LOW' ? 'Low' : 'Medium';
        setLevel(newLevel);
        setFactorTexts(detail.factorSummaries || []);
        setSummary(detail.summary || null);
        setGuidance(detail.guidance || null);
        setDisclaimer(detail.disclaimer || null);
      } catch {
        // 실패 시 기존 값(로컬 state)에 그대로 둠
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [assessment.id]);

  const getLevelInfo = () => {
    switch(level) {
      case 'High':
        return { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-200', text: '고위험' };
      case 'Medium':
        return { color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-200', text: '중위험' };
      case 'Low':
        return { color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200', text: '저위험' };
    }
  };

  const levelInfo = getLevelInfo();

  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Always save current state when leaving to ensure data persistence
    // This prevents data loss if the user returns to dashboard without matching
    if (onSave) {
      onSave();
    }
    onNavigate('dashboard');
  };

  const handleGoToMatching = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onNavigate('job-matching');
  };

  return (
    <div className="max-w-4xl mx-auto pb-24 pt-8">
      <div className="mb-10 text-center">
        <h2 className="text-xl font-medium text-slate-600">
          {isCompleted ? '신청자의 위험도 분석 및 일자리 매칭 결과입니다.' : 'AI가 분석한 신청자의 안전 위험도입니다.'}
        </h2>
      </div>

      <div className="space-y-8">
        {/* Risk Analysis Section */}
        <div className="bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Left: Chart */}
          <div className="flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 pb-8 md:pb-0 md:pr-8">
            <div className="relative w-64 h-64 flex items-center justify-center mb-6">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="128"
                  cy="128"
                  r="110"
                  stroke="#f3f4f6"
                  strokeWidth="20"
                  fill="transparent"
                />
                <motion.circle
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: score / 100 }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  cx="128"
                  cy="128"
                  r="110"
                  stroke={level === 'High' ? '#ef4444' : level === 'Medium' ? '#f59e0b' : '#22c55e'}
                  strokeWidth="20"
                  fill="transparent"
                  strokeLinecap="round"
                  className="drop-shadow-sm"
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-7xl font-bold text-gray-800">{score}</span>
                <span className={`text-2xl font-bold ${levelInfo.color} mt-2`}>{levelInfo.text}</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm text-center">
              종합적인 데이터를 기반으로<br/>산출된 결과입니다.
            </p>
          </div>

          {/* Right: Details */}
          <div className="flex flex-col justify-center space-y-8">
            <div className={`p-6 rounded-2xl border ${levelInfo.bg} ${levelInfo.border}`}>
              <div className="flex items-start gap-4">
                <Info className={`${levelInfo.color} shrink-0 mt-1`} size={24} />
                <div>
                  <h3 className={`font-bold ${levelInfo.color} mb-2 text-lg`}>AI 해석 요약</h3>
                  <p className="text-gray-700 leading-relaxed text-sm md:text-base whitespace-pre-line">
                    {summary ||
                      (level === 'High'
                        ? '즉각적인 안전 조치가 필요한 고위험군입니다. 야외 활동 및 고강도 노동을 제한해야 합니다.'
                        : level === 'Medium'
                        ? '일부 환경에서 위험이 예상됩니다. 주기적인 모니터링과 적절한 휴식이 권장됩니다.'
                        : '일상적인 활동에 큰 제약이 없는 안전한 상태입니다.')}
                  </p>
                  {guidance && (
                    <p className="text-gray-600 text-xs md:text-sm mt-3 whitespace-pre-line">
                      {guidance}
                    </p>
                  )}
                  {disclaimer && (
                    <p className="text-gray-400 text-xs mt-3 whitespace-pre-line">
                      {disclaimer}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                <AlertTriangle size={20} className="text-gray-400" />
                주요 기여 요인
              </h3>
              <div className="space-y-3">
                {factorTexts && factorTexts.length > 0 ? (
                  factorTexts.map((factor, idx) => (
                    <div key={idx} className="bg-gray-50 px-5 py-4 rounded-xl border border-gray-100 flex items-center justify-between">
                      <span className="text-gray-700 font-medium">{factor}</span>
                      <span className="text-xs text-red-500 font-bold bg-white border border-red-100 px-2 py-1 rounded-md shadow-sm">+ 위험요인</span>
                    </div>
                  ))
                ) : (
                  <div className="bg-gray-50 px-5 py-4 rounded-xl border border-gray-100 text-gray-500 text-center py-6">
                    <p className="font-medium">요인별 설명이 없습니다.</p>
                    <p className="text-xs mt-1">AI 설명이 생성되지 않았거나, 위험도 계산 시 설명 API가 호출되지 않았을 수 있습니다. (Gemini API 키·FastAPI 서버 확인)</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Job Matches Section */}
        {jobMatches.length > 0 && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 px-2">
              매칭된 일자리 ({jobMatches.length}건)
            </h3>

            {jobMatches.map((match, index) => (
              <motion.div
                key={match.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                  <div className="bg-[#E5F2ED] p-3 rounded-xl">
                    <Briefcase className="text-[#2F8F6B]" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{match.jobName}</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      매칭일: {match.matchedDate ? new Date(match.matchedDate).toLocaleDateString() : '-'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                  <div>
                    <label className="text-sm font-bold text-gray-500 mb-1 block">근무 장소</label>
                    <div className="flex items-center gap-2 text-gray-700">
                      <MapPin size={18} className="text-gray-400" />
                      {match.location}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-500 mb-1 block">근무 시간</label>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Clock size={18} className="text-gray-400" />
                      {match.time}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-gray-500 mb-1 block">근무 요일</label>
                    <div className="flex items-center gap-2 text-gray-700">
                      <Calendar size={18} className="text-gray-400" />
                      <div className="flex gap-1">
                        {match.workDays.map(day => (
                          <span key={day} className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">
                            {day}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm font-bold text-gray-500 mb-1 block">상세 내용</label>
                    <div className="flex gap-2">
                      <AlignLeft size={18} className="text-gray-400 shrink-0 mt-1" />
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {match.description || "상세 내용 없음"}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
          <div className="max-w-4xl mx-auto flex gap-4">
             {/* Always show back button */}
             <button
               type="button"
               onClick={handleBack}
               className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-4 rounded-xl transition-all"
             >
               목록으로 돌아가기
             </button>

             {/* Add/Start Matching Button */}
             <button
               type="button"
               onClick={handleGoToMatching}
               className="flex-1 bg-[#2F8F6B] hover:bg-[#257A5A] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#2F8F6B]/20 transition-all flex items-center justify-center gap-2 transform active:scale-[0.99] text-lg"
             >
               {jobMatches.length > 0 ? (
                 <>
                   <Plus size={22} />
                   <span>일자리 추가 매칭</span>
                 </>
               ) : (
                 <>
                   <Send size={22} className="rotate-0" />
                   <span>일자리 매칭 진행</span>
                 </>
               )}
             </button>
          </div>
        </div>
      </div>

      {/* Spacer for fixed bottom bar */}
      <div className="h-20"></div>
    </div>
  );
}
