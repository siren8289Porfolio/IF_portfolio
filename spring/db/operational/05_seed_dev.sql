-- =============================================================================
-- 로컬 개발용 시드 (선택 적용: apply-schema.sh --seed)
-- =============================================================================

INSERT INTO admin_user (name, organization, role, created_at)
SELECT '개발 관리자', 'IF Portfolio', 'operator', now()
WHERE NOT EXISTS (SELECT 1 FROM admin_user);

INSERT INTO job (job_title, workplace, work_hours, description, created_at)
SELECT v.job_title, v.workplace, v.work_hours, v.description, now()
FROM (VALUES
    ('경비', '서울시립도서관', '주 20시간', '출입 통제 및 순찰'),
    ('환경미화', '구립공원', '주 15시간', '공원 청소 및 환경 정비'),
    ('사회복지 보조', '주민센터', '주 25시간', '복지 서비스 안내 보조')
) AS v(job_title, workplace, work_hours, description)
WHERE NOT EXISTS (SELECT 1 FROM job);
