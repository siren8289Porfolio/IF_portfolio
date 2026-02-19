import React, { useEffect, useState } from 'react';
import { Page, Assessment, JobMatch } from '@/shared/types/appTypes';
import { Briefcase, MapPin, Clock, Calendar, AlignLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getRiskDetail } from '@/shared/api/assessments';

interface JobMatchingProps {
  onNavigate: (page: Page) => void;
  assessment: Partial<Assessment>;
  onUpdateAssessment: (data: Partial<Assessment>) => void;
}

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

function RiskHeader({ assessment }: { assessment: Partial<Assessment> }) {
  const [score, setScore] = useState<number | null>(null);
  const [level, setLevel] = useState<'Low' | 'Medium' | 'High'>('Low');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = assessment.id ? Number(assessment.id) : NaN;
    if (!assessment.id || Number.isNaN(id)) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const detail = await getRiskDetail(id);
        if (cancelled) return;
        setScore(detail.riskScore ?? 0);
        const newLevel: 'Low' | 'Medium' | 'High' =
          detail.riskGrade === 'HIGH' ? 'High' :
          detail.riskGrade === 'LOW' ? 'Low' : 'Medium';
        setLevel(newLevel);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [assessment.id]);

  if (score === null && !loading) return null;

  const color =
    level === 'High'
      ? 'text-red-600 bg-red-50 border-red-200'
      : level === 'Medium'
      ? 'text-amber-600 bg-amber-50 border-amber-200'
      : 'text-green-600 bg-green-50 border-green-200';

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">AI 위험도 요약</p>
          {score !== null ? (
            <p className="text-lg font-bold text-gray-800">
              위험도 {score}% · {level === 'High' ? '고위험' : level === 'Medium' ? '중위험' : '저위험'}
            </p>
          ) : (
            <p className="text-sm text-gray-500">위험도 정보를 불러오는 중입니다…</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function JobMatching({ onNavigate, assessment, onUpdateAssessment }: JobMatchingProps) {
  // Always start with empty form for new match
  const [formData, setFormData] = useState<Partial<JobMatch>>({
    jobName: '',
    location: '',
    time: '',
    workDays: [],
    description: ''
  });

  const handleDayToggle = (day: string) => {
    setFormData(prev => {
      const currentDays = prev.workDays || [];
      const exists = currentDays.includes(day);
      if (exists) {
        return { ...prev, workDays: currentDays.filter(d => d !== day) };
      } else {
        // Sort days based on standard week order
        const newDays = [...currentDays, day].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b));
        return { ...prev, workDays: newDays };
      }
    });
  };

  const handleChange = (field: keyof JobMatch, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = formData.jobName && formData.location && formData.time && formData.workDays && formData.workDays.length > 0;

  const handleSubmit = () => {
    if (isFormValid) {
      const newMatch: JobMatch = {
        id: Date.now().toString(),
        jobName: formData.jobName!,
        location: formData.location!,
        time: formData.time!,
        workDays: formData.workDays!,
        description: formData.description || '',
        matchedDate: new Date().toISOString()
      };

      const updatedMatches = [...(assessment.jobMatches || []), newMatch];

      onUpdateAssessment({
        jobMatches: updatedMatches,
        status: 'Matched' // Update status to Matched if it wasn't already
      });

      onNavigate('app-transfer');
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-24">
      {/* 상단: AI 위험도 요약 (있으면) */}
      <RiskHeader assessment={assessment} />

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">일자리 매칭 정보 입력</h2>
            <p className="text-gray-600 mt-1">
              대상자에게 연계할 새로운 일자리 정보를 입력해주세요.
            </p>
          </div>
          <div className="bg-green-50 text-[#2F8F6B] px-4 py-2 rounded-lg text-sm font-bold">
            추가 입력 모드
          </div>
        </div>

        <div className="space-y-6">
          {/* Job Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Briefcase size={18} className="text-[#2F8F6B]" />
              일자리명 (직무명)
            </label>
            <input
              type="text"
              value={formData.jobName}
              onChange={(e) => handleChange('jobName', e.target.value)}
              placeholder="예: 시니어 안전 지킴이"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2F8F6B] focus:border-transparent transition-all"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <MapPin size={18} className="text-[#2F8F6B]" />
              근무 장소
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              placeholder="예: 서울시 강남구 논현동"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2F8F6B] focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Clock size={18} className="text-[#2F8F6B]" />
                근무 시간
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => handleChange('time', e.target.value)}
                placeholder="예: 09:00 - 13:00"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2F8F6B] focus:border-transparent transition-all"
              />
            </div>

            {/* Work Days */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
                <Calendar size={18} className="text-[#2F8F6B]" />
                근무 요일
              </label>
              <div className="flex justify-between bg-gray-50 p-2 rounded-xl border border-gray-100">
                {DAYS.map(day => (
                  <button
                    key={day}
                    onClick={() => handleDayToggle(day)}
                    className={`
                      w-9 h-9 rounded-lg text-sm font-bold transition-all
                      ${formData.workDays?.includes(day)
                        ? 'bg-[#2F8F6B] text-white shadow-md'
                        : 'text-gray-400 hover:bg-gray-200'
                      }
                    `}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <AlignLeft size={18} className="text-[#2F8F6B]" />
              직무 상세 내용
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="구체적인 업무 내용과 유의사항을 입력해주세요."
              rows={4}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2F8F6B] focus:border-transparent transition-all resize-none"
            />
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {isFormValid ? '모든 정보가 입력되었습니다.' : '필수 정보를 모두 입력해주세요.'}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isFormValid}
            className={`
              flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-lg transition-all shadow-lg
              ${isFormValid
                ? 'bg-[#2F8F6B] text-white hover:bg-[#257255] hover:shadow-xl hover:-translate-y-0.5'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            매칭 완료 및 전송
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
