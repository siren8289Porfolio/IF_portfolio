import React, { useEffect } from 'react';
import { Page, Assessment } from '@/shared/types/appTypes';
import { motion } from 'motion/react';
import { Brain } from 'lucide-react';
import { computeRisk } from '@/shared/api/assessments';

interface RiskAnalysisProps {
  onNavigate: (page: Page) => void;
  currentAssessment: Partial<Assessment>;
  onUpdateAssessment: (data: Partial<Assessment>) => void;
}

export function RiskAnalysis({ onNavigate, currentAssessment, onUpdateAssessment }: RiskAnalysisProps) {

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const id = currentAssessment.id ? Number(currentAssessment.id) : NaN;
      if (!currentAssessment.id || Number.isNaN(id)) {
        onNavigate('dashboard');
        return;
      }
      try {
        await computeRisk(id);
        if (cancelled) return;
        // 상태만 'Analyzed'로 표시해 두고, 실제 점수/설명은 RiskResult에서 불러옴
        onUpdateAssessment({
          status: 'Analyzed',
        });
      } catch {
        if (cancelled) return;
        onUpdateAssessment({
          riskScore: 0,
          riskLevel: 'Low',
          riskFactors: [],
          status: 'Analyzed',
        });
      } finally {
        if (!cancelled) {
          onNavigate('risk-result');
        }
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [currentAssessment, onNavigate, onUpdateAssessment]);

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="bg-white p-16 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center max-w-lg w-full text-center">
        <div className="relative mb-10">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-32 h-32 border-[6px] border-[#2F8F6B]/10 border-t-[#2F8F6B] rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center text-[#2F8F6B]">
            <Brain size={48} />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-3">AI 위험도 분석 중</h2>
        <p className="text-gray-500 text-lg">
          입력된 정보를 바탕으로<br/>안전 위험 요인을 정밀 분석하고 있습니다.
        </p>

        <motion.div
          className="mt-10 flex gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-3 h-3 bg-[#2F8F6B] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
          <div className="w-3 h-3 bg-[#2F8F6B] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          <div className="w-3 h-3 bg-[#2F8F6B] rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
        </motion.div>
      </div>
    </div>
  );
}
