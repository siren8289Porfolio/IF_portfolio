import React, { useEffect, useState } from 'react';
import { Page, Assessment } from '@/shared/types/appTypes';
import { motion } from 'motion/react';
import { Check, Smartphone, Send, Server } from 'lucide-react';
import { saveJobMatches } from '@/shared/api/assessments';

interface AppTransferProps {
  onNavigate: (page: Page) => void;
  assessment: Partial<Assessment>;
  onSave: () => void;
}

export function AppTransfer({ onNavigate, assessment, onSave }: AppTransferProps) {
  const [status, setStatus] = useState<'preparing' | 'sending' | 'completed'>('preparing');

  useEffect(() => {
    // Sequence: Preparing -> Sending -> Completed
    const t1 = setTimeout(() => setStatus('sending'), 1500);
    const t2 = setTimeout(async () => {
      const assessmentId = assessment.id ? Number(assessment.id) : NaN;
      const matches = assessment.jobMatches ?? [];
      if (!Number.isNaN(assessmentId) && matches.length > 0) {
        try {
          await saveJobMatches(
            assessmentId,
            matches.map((m) => ({
              jobName: m.jobName,
              location: m.location,
              time: m.time,
              workDays: m.workDays ?? [],
              description: m.description ?? '',
            }))
          );
        } catch (_) {
          // API 실패 시에도 로컬 저장은 진행
        }
      }
      setStatus('completed');
      onSave(); // Save to localStorage
    }, 4500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onSave, assessment.id, assessment.jobMatches]);

  const handleComplete = () => {
    onNavigate('dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-white p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col items-center max-w-xl w-full text-center">

        {/* Visualization Area */}
        <div className="relative mb-12 w-full h-64 flex items-center justify-center bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">

          {/* Server Icon (Left) */}
          <div className="absolute left-10 flex flex-col items-center z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 ${status === 'completed' ? 'bg-[#2F8F6B] text-white shadow-lg shadow-[#2F8F6B]/30' : 'bg-white border border-gray-200 text-gray-400'}`}>
              <Server size={32} />
            </div>
            <span className="text-xs font-bold text-gray-400 mt-2">시스템</span>
          </div>

          {/* Connection Line */}
          <div className="absolute left-28 right-28 h-1 bg-gray-200 rounded-full overflow-hidden">
             {status === 'sending' && (
               <motion.div
                 className="h-full bg-[#2F8F6B]"
                 initial={{ x: '-100%' }}
                 animate={{ x: '100%' }}
                 transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
               />
             )}
             {status === 'completed' && (
               <div className="h-full bg-[#2F8F6B] w-full" />
             )}
          </div>

          {/* Phone Icon (Right) */}
          <div className="absolute right-10 flex flex-col items-center z-10">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors duration-500 ${status === 'completed' ? 'bg-[#2F8F6B] text-white shadow-lg shadow-[#2F8F6B]/30' : 'bg-white border border-gray-200 text-gray-400'}`}>
              {status === 'completed' ? <Check size={32} /> : <Smartphone size={32} />}
            </div>
            <span className="text-xs font-bold text-gray-400 mt-2">신청자 앱</span>
          </div>

          {/* Moving Packet */}
          {status === 'sending' && (
            <motion.div
              className="absolute w-8 h-8 bg-[#2F8F6B] rounded-full flex items-center justify-center text-white shadow-md z-20"
              animate={{ x: [-80, 80] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            >
              <Send size={14} />
            </motion.div>
          )}

        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {status === 'preparing' && "데이터 패키징 중..."}
          {status === 'sending' && "결과 전송 중..."}
          {status === 'completed' && "전송 완료!"}
        </h2>

        <p className="text-gray-500 text-lg mb-10 px-4">
          {status === 'preparing' && "분석 결과와 매칭 정보를 정리하고 있습니다."}
          {status === 'sending' && `${assessment.applicantName || '신청자'}님의 모바일 앱으로 알림을 보내고 있습니다.`}
          {status === 'completed' && (
            <>
              모든 과정이 성공적으로 마무리되었습니다.
              <span className="block mt-3 text-sm text-gray-600">
                앱에서 <strong>최근 판단 기록</strong> 화면을 <strong>당겨서 새로고침</strong>하면 목록에 표시됩니다.
              </span>
            </>
          )}
        </p>

        {status === 'completed' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full"
          >
            <button
              onClick={handleComplete}
              className="w-full bg-[#2F8F6B] hover:bg-[#257A5A] text-white font-bold py-5 rounded-xl shadow-lg shadow-[#2F8F6B]/30 transition-all active:scale-[0.99] text-lg"
            >
              대시보드로 돌아가기
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
