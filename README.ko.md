![CI](https://github.com/KIM3310/qwen-pilot/actions/workflows/ci.yml/badge.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)

# qwen-pilot

[English](README.md) | [한국어](README.ko.md)

Alibaba Qwen CLI를 위한 멀티 에이전트 오케스트레이션 하네스. 프롬프트 관리, 워크플로우 실행, 팀 협업 기능을 제공합니다.

## 주요 기능

- **에이전트 시스템** -- 15개의 내장 에이전트 역할(architect, executor, reviewer, debugger 등)과 Zod 기반 검증 및 모델 티어 라우팅
- **워크플로우 엔진** -- 게이트(pass/review/test), 재시도, 루프를 지원하는 단계별 워크플로우 실행
- **팀 협업** -- tmux 기반 병렬 에이전트 실행, 태스크 큐잉, 하트비트 모니터링, 페이즈 관리(plan/execute/verify/fix)
- **하네스 세션** -- 모델 티어 선택(high/balanced/fast), 샌드박스 모드, 컨텍스트 주입을 지원하는 강화된 Qwen CLI 세션
- **상태 저장소** -- 네임스페이스 기반 키-값 파일 저장소
- **훅 시스템** -- 세션, 워크플로우, 팀, 태스크 이벤트를 위한 이벤트 기반 라이프사이클 훅
- **MCP 통합** -- Model Context Protocol 서버
- **프롬프트 관리** -- YAML 프론트매터가 포함된 마크다운 기반 프롬프트 정의

## 원클릭 설치

```bash
git clone https://github.com/KIM3310/qwen-pilot.git
cd qwen-pilot
```

| 플랫폼 | 설치 방법 |
|--------|----------|
| **macOS** | **`Install-Mac.command`** 더블클릭 |
| **Windows** | **`Install-Windows.bat`** 더블클릭 |
| **Linux** | 터미널에서 `./Install-Linux.sh` 실행 |

이것만 하면 됩니다 -- Node.js, Qwen CLI, 의존성, 빌드, `qp` 명령어 글로벌 등록을 자동으로 처리합니다.

## 요구 사항

- Node.js >= 20.0.0
- Qwen Code CLI (`npm install -g @qwen-code/qwen-code`)
- tmux (선택 사항, 팀 협업용)

## 설치

```bash
npm install -g qwen-pilot
```

또는 프로젝트 내 로컬 설치:

```bash
npm install qwen-pilot
```

## 빠른 시작

```bash
# 프로젝트 초기화
qp setup

# 강화된 세션 실행
qp harness

# 고성능 모델 사용
qp harness --max

# 단일 쿼리
qp ask "이 코드베이스를 설명해줘"

# 워크플로우 실행
qp workflows run autopilot

# 3개 워커로 팀 구성
qp team 3 --role executor --task "기능 X 구현"
```

## CLI 명령어

| 명령어 | 설명 |
|--------|------|
| `qp setup` | 현재 프로젝트에서 qwen-pilot 초기화 |
| `qp harness` | 강화된 Qwen CLI 세션 실행 |
| `qp ask <prompt>` | Qwen에 단일 쿼리 |
| `qp team <count>` | tmux로 멀티 에이전트 팀 실행 |
| `qp prompts list` | 사용 가능한 에이전트 프롬프트 목록 |
| `qp prompts show <name>` | 특정 프롬프트 상세 정보 |
| `qp workflows list` | 사용 가능한 워크플로우 목록 |
| `qp workflows show <name>` | 특정 워크플로우 상세 정보 |
| `qp workflows run <name>` | 워크플로우 실행 |
| `qp config show` | 현재 설정 표시 |
| `qp config validate` | 설정 유효성 검사 |
| `qp doctor` | qwen-pilot 설치 확인 |
| `qp status` | 활성 세션 및 상태 표시 |

## 설정

설정은 계층적으로 적용됩니다 (사용자 수준, 프로젝트 수준, 환경 변수):

```json
{
  "models": {
    "high": "qwen3.5-plus",
    "balanced": "qwen3-coder-plus",
    "fast": "qwen3-coder-next"
  },
  "harness": {
    "defaultTier": "balanced",
    "sandboxMode": "relaxed",
    "maxTokens": 8192,
    "temperature": 0.7
  },
  "team": {
    "maxWorkers": 4,
    "heartbeatIntervalMs": 5000,
    "taskTimeoutMs": 300000
  }
}
```

설정 파일 위치:
1. `~/.config/qwen-pilot/qwen-pilot.json` (사용자 수준)
2. `.qwen-pilot/qwen-pilot.json` (프로젝트 수준)

환경 변수 오버라이드: `QP_MODEL_HIGH`, `QP_MODEL_BALANCED`, `QP_MODEL_FAST`, `QP_SANDBOX_MODE`, `QP_MAX_WORKERS`.

## 모델 티어

| 티어 | 기본 모델 | 용도 |
|------|-----------|------|
| High | qwen3.5-plus | 복잡한 추론, 아키텍처, 계획 (256K 컨텍스트, 201개 언어) |
| Balanced | qwen3-coder-plus | 일반 구현, 리뷰 (코딩 최적화) |
| Fast | qwen3-coder-next | 빠른 작업, 포매팅, 간단한 쿼리 (빠른 코딩 모델) |

## 내장 에이전트 역할

architect, planner, executor, debugger, reviewer, security-auditor, test-engineer, optimizer, documenter, designer, analyst, scientist, refactorer, critic, mentor

## 내장 워크플로우

autopilot, deep-plan, sprint, investigate, tdd, review-cycle, refactor, deploy-prep, interview, team-sync

## 프로젝트 구조

```
src/
  agents/     -- 에이전트 역할 정의 및 모델 라우팅
  cli/        -- Commander.js CLI 인터페이스
  config/     -- Zod 기반 검증을 포함한 계층적 설정 로딩
  harness/    -- 세션 관리 및 컨텍스트 주입
  hooks/      -- 이벤트 기반 라이프사이클 훅
  mcp/        -- Model Context Protocol 서버
  prompts/    -- 프롬프트 관리
  state/      -- 파일 기반 영구 상태 저장소
  team/       -- tmux 기반 팀 협업
  utils/      -- 공유 유틸리티 (fs, logger, markdown, process)
  workflows/  -- 단계별 워크플로우 엔진
prompts/      -- 내장 에이전트 프롬프트 정의 (.md)
workflows/    -- 내장 워크플로우 정의 (.md)
__tests__/    -- Vitest 테스트 스위트
```

## 개발

```bash
npm install
npm run build
npm test
npm run dev    # 감시 모드
```

## 라이선스

MIT -- 자세한 내용은 [LICENSE](LICENSE)를 참조하세요.
