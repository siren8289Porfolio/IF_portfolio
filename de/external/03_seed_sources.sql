-- =============================================================================
-- Confirmed public/reference sources for IF DE.
-- Operational core must not depend on these sources being fresh or available.
-- =============================================================================

INSERT INTO external_ref.source_catalog
    (source_name, source_url, source_type, serving_target, is_required_for_core, collection_frequency, license_note)
VALUES
    ('노인사회활동 시스템 코드', 'https://www.data.go.kr/data/15057083/openapi.do', 'OPENAPI_XML', 'region_master,organization_master', false, 'on demand / monthly', '공공데이터포털 활용신청 및 운영 한도 재확인 필요'),
    ('자립형일자리 코드', 'https://www.data.go.kr/data/15058307/openapi.do', 'OPENAPI_XML', 'region_master', false, 'on demand / monthly', '공공데이터포털 활용신청 및 운영 한도 재확인 필요'),
    ('자립형일자리 수행기관', 'https://www.data.go.kr/data/15056961/openapi.do', 'OPENAPI_XML', 'organization_master', false, 'on demand / monthly', '공공데이터포털 활용신청 및 운영 한도 재확인 필요'),
    ('자립형일자리 사업모집공고', 'https://www.data.go.kr/data/15057200/openapi.do', 'OPENAPI_XML', 'job_posting_reference', false, 'daily / monthly snapshot', '공공데이터포털 활용신청 및 운영 한도 재확인 필요'),
    ('노인 구인정보 Senuri', 'https://www.data.go.kr/data/15015153/openapi.do', 'OPENAPI_XML', 'job_posting_reference', false, 'daily / monthly snapshot', '공공데이터포털 활용신청 및 운영 한도 재확인 필요'),
    ('노인일자리 통합정보', 'https://www.data.go.kr/data/15050148/fileData.do', 'FILE_CSV', 'job_reference', false, 'monthly / annual', '공공데이터포털 파일 기준일 확인 필요'),
    ('노인일자리사업 홈페이지 공고', 'https://www.data.go.kr/data/15050147/fileData.do', 'FILE_CSV', 'job_posting_reference', false, 'monthly', '공공데이터포털 파일 기준일 확인 필요'),
    ('보건복지부 노인일자리 사회활동 지원사업 시도별', 'https://www.data.go.kr/data/15127867/fileData.do', 'FILE_CSV', 'elderly_employment_snapshot', false, 'annual', '집단 Context only'),
    ('산업재해통계 마이크로데이터', 'https://www.data.go.kr/data/15127634/fileData.do', 'FILE_XLSX', 'ai_job_risk_profile', false, 'annual', '직무/업종/연령 집단의 사전 위험도 대리변수'),
    ('KOSIS 공유서비스 OpenAPI', 'https://kosis.kr/openapi/', 'KOSIS', 'elderly_employment_snapshot', false, 'monthly / annual', '집단 Context only')
ON CONFLICT (source_name, source_url) DO UPDATE
SET source_type = EXCLUDED.source_type,
    serving_target = EXCLUDED.serving_target,
    is_required_for_core = EXCLUDED.is_required_for_core,
    collection_frequency = EXCLUDED.collection_frequency,
    license_note = EXCLUDED.license_note,
    updated_at = now();
