import React, { useCallback, useEffect, useState } from 'react';
import { Page, Assessment } from '@/shared/types/appTypes';
import { Plus, User, AlertTriangle, FileText, CheckCircle, ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  listAssessmentRecords,
  getAssessmentSummary,
  deleteAssessment,
  updateAssessment,
} from '@/shared/api/assessments';
import type { AssessmentRecordResponse, AssessmentSummaryResponse } from '@/shared/api/types';

const PAGE_SIZE = 20;

interface DashboardProps {
  onNavigate: (page: Page) => void;
  onSelectAssessment: (assessment: Assessment | null, navigate?: boolean) => void;
}

const RISK_GRADE_MAP: Record<string, Assessment['riskLevel']> = {
  LOW: 'Low',
  MID: 'Medium',
  HIGH: 'High',
};

/** AssessmentForm에서 저장한 physicalLevel(1~5 문자열)을 화면 표시용 한글 라벨로 변환 */
function physicalLevelToLabel(physicalLevel: string | null): string {
  if (!physicalLevel) return '정보 없음';
  const level = Number(physicalLevel);
  if (level <= 2) return '좋음';
  if (level >= 4) return '나쁨';
  return '보통';
}

function mapApiToAssessment(ass: AssessmentRecordResponse): Assessment {
  const statusMap: Record<string, Assessment['status']> = {
    PENDING_AI: 'Draft',
    AI_COMPLETED: 'Analyzed',
    FINALIZED: 'Completed',
  };
  return {
    id: String(ass.id),
    date: ass.assessedAt,
    applicantName: ass.applicantName,
    age: ass.age,
    healthStatus: physicalLevelToLabel(ass.physicalLevel),
    riskScore: ass.riskScore ?? 0,
    riskLevel: (ass.riskGrade && RISK_GRADE_MAP[ass.riskGrade]) || 'Medium',
    riskFactors: [],
    status: statusMap[ass.status] ?? 'Draft',
  };
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING_AI', label: 'AI 대기' },
  { value: 'AI_COMPLETED', label: '분석 완료' },
  { value: 'FINALIZED', label: '확정' },
];

export function Dashboard({ onNavigate, onSelectAssessment }: DashboardProps) {
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [summary, setSummary] = useState<AssessmentSummaryResponse | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>('');

  const loadFromApi = useCallback(async (page = 0) => {
    setLoading(true);
    setError(null);
    try {
      // 신청자마다 따로 조회하던 N+1 호출 대신, 서버에서 join + 페이지네이션된 목록을
      // 한 번에 받아온다 (GET /api/assessments). 요약 카드는 목록 페이지 길이가 아니라
      // 별도 COUNT 집계(GET /api/assessments/summary)로 정확한 전체 건수를 구한다.
      const [listRes, summaryRes] = await Promise.all([
        listAssessmentRecords(page, PAGE_SIZE),
        getAssessmentSummary(),
      ]);
      setAssessments(listRes.content.map(mapApiToAssessment));
      setTotalPages(listRes.totalPages);
      setPageIndex(listRes.number);
      setSummary(summaryRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
      setAssessments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromApi(0);
  }, [loadFromApi]);

  const handleNewAssessment = () => {
    onSelectAssessment(null); // Clear current selection and navigate
  };

  const handleRowClick = (item: Assessment) => {
    if (expandedId === item.id) {
      setExpandedId(null);
    } else {
      setExpandedId(item.id);
      onSelectAssessment(item, false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, item: Assessment) => {
    e.stopPropagation();
    if (!window.confirm(`「${item.applicantName}」 평가 기록을 삭제하시겠습니까?`)) return;
    try {
      await deleteAssessment(Number(item.id));
      setExpandedId((id) => (id === item.id ? null : id));
      await loadFromApi(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  };

  const openEdit = (e: React.MouseEvent, item: Assessment) => {
    e.stopPropagation();
    setEditId(item.id);
    const s = item.status === 'Draft' ? 'PENDING_AI' : item.status === 'Analyzed' ? 'AI_COMPLETED' : 'FINALIZED';
    setEditStatus(s);
  };

  const closeEdit = () => {
    setEditId(null);
    setEditStatus('');
  };

  const handleSaveStatus = async () => {
    if (!editId) return;
    try {
      await updateAssessment(Number(editId), { status: editStatus });
      closeEdit();
      await loadFromApi(pageIndex);
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Analyzed': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'High': return 'text-red-500 bg-red-50 px-2.5 py-1 rounded-md';
      case 'Medium': return 'text-amber-500 bg-amber-50 px-2.5 py-1 rounded-md';
      case 'Low': return 'text-green-500 bg-green-50 px-2.5 py-1 rounded-md';
      default: return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">안녕하세요, 관리자님</h2>
          <p className="text-gray-500 mt-1">오늘의 위험도 판단 업무 현황입니다.</p>
        </div>
        <button
          onClick={handleNewAssessment}
          className="flex items-center gap-2 bg-[#2F8F6B] hover:bg-[#257A5A] text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-[#2F8F6B]/20 transition-all active:scale-[0.98]"
        >
          <Plus size={20} />
          <span>새로운 평가 시작</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          {error}
          <button type="button" onClick={() => loadFromApi(pageIndex)} className="ml-2 underline">다시 시도</button>
        </div>
      )}
      {loading && (
        <div className="mb-8 text-center py-12 text-gray-500">불러오는 중...</div>
      )}

      {!loading && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
              <FileText size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">총 평가 건수</p>
              <p className="text-3xl font-bold text-gray-800">{summary?.totalCount ?? 0}건</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl">
              <AlertTriangle size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">고위험군 발견</p>
              <p className="text-3xl font-bold text-gray-800">
                {summary?.highRiskCount ?? 0}건
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
              <CheckCircle size={28} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">평가 완료</p>
              <p className="text-3xl font-bold text-gray-800">
                {summary?.finalizedCount ?? 0}건
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-bold text-xl text-gray-800">최근 평가 기록</h3>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">총 {summary?.totalCount ?? 0}건</span>
        </div>

        {!loading && assessments.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
              <FileText size={40} />
            </div>
            <p className="text-lg text-gray-500 font-medium">아직 등록된 평가 기록이 없습니다.</p>
            <p className="text-gray-400 mt-2 mb-8">새로운 신청자의 위험도를 평가해보세요.</p>
            <button
              onClick={handleNewAssessment}
              className="text-[#2F8F6B] font-bold hover:underline"
            >
              평가 시작하기
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500">상태</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500">신청자</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500 hidden md:table-cell">나이/건강</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500 hidden md:table-cell">위험도</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500 hidden md:table-cell">날짜</th>
                  <th className="px-8 py-5 text-sm font-bold text-gray-500 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assessments.map((item, index) => [
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50/80 transition-colors cursor-pointer group ${expandedId === item.id ? 'bg-gray-50' : ''}`}
                    onClick={() => handleRowClick(item)}
                  >
                    <td className="px-8 py-5 whitespace-nowrap">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <User size={18} />
                        </div>
                        <div>
                          <span className="font-bold text-gray-800 text-lg block">{item.applicantName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      <span className="text-gray-600 font-medium">{item.age}세 <span className="text-gray-300 mx-2">|</span> {item.healthStatus}</span>
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell">
                      {item.riskLevel && (
                        <span className={`text-sm font-bold ${getRiskColor(item.riskLevel)}`}>
                          {item.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-8 py-5 hidden md:table-cell text-gray-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200 transition-colors">
                        {expandedId === item.id ? (
                          <ChevronUp size={20} className="text-[#2F8F6B]" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-400 group-hover:text-[#2F8F6B]" />
                        )}
                      </div>
                    </td>
                  </motion.tr>,

                  // Expanded Content Row
                  <AnimatePresence key={`${item.id}-presence`}>
                    {expandedId === item.id && (
                      <motion.tr
                        key={`${item.id}-expanded`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <td colSpan={6} className="p-0 border-0">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden bg-gray-50"
                          >
                            <div className="p-8 border-b border-gray-100">
                              <div className="flex justify-between items-start mb-6">
                                <h4 className="font-bold text-gray-800 text-lg">상세 정보</h4>
                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onNavigate('risk-result');
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                                  >
                                    <FileText size={16} />
                                    상세 리포트 보기
                                  </button>
                                  <button
                                    onClick={(e) => openEdit(e, item)}
                                    className="px-4 py-2 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-sm hover:bg-amber-50 transition-colors flex items-center gap-2"
                                  >
                                    <Pencil size={16} />
                                    상태 수정
                                  </button>
                                  <button
                                    onClick={(e) => handleDelete(e, item)}
                                    className="px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg font-bold text-sm hover:bg-red-50 transition-colors flex items-center gap-2"
                                  >
                                    <Trash2 size={16} />
                                    삭제
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </motion.tr>
                    )}
                  </AnimatePresence>
                ])}
              </tbody>
            </table>
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-8 py-5 border-t border-gray-100">
            <span className="text-sm text-gray-500">{pageIndex + 1} / {totalPages} 페이지</span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pageIndex === 0}
                onClick={() => loadFromApi(pageIndex - 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                이전
              </button>
              <button
                type="button"
                disabled={pageIndex + 1 >= totalPages}
                onClick={() => loadFromApi(pageIndex + 1)}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-bold text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                다음
              </button>
            </div>
          </div>
        )}
      </div>
      </>
      )}

      {/* 상태 수정 모달 */}
      {editId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={closeEdit}>
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-lg text-gray-800 mb-4">상태 수정</h4>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-800 font-medium mb-6"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeEdit}
                className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveStatus}
                className="flex-1 py-3 bg-[#2F8F6B] text-white rounded-xl font-bold hover:bg-[#257A5A]"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
