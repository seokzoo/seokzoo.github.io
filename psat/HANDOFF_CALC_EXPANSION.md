# [Handoff Guide] 자료해석(PSAT 계산) 신규 문제 추가 가이드

이 문서는 향후 새로운 자료해석(계산 연습) 문제 데이터셋이 추가될 때, 다음 에이전트(Clear Agent / Successor Agent)가 구조를 즉시 파악하고 실수 없이 안전하게 서비스를 확장할 수 있도록 작성된 핸드오프 가이드입니다.

---

## 1. 시스템 구조 및 데이터 파이프라인 개요

이 서비스는 클라이언트 사이드 단일 페이지 애플리케이션(SPA)이며, 오프라인(PWA) 지원을 포함합니다.

```
[Raw JSON 데이터 파일들]
  ├── div.json (나눗셈 750문제)
  ├── mul.json (곱셈 900문제)
  ├── add_sub.json (덧뺄셈 표 250문제)
  └── 10_19_prob.json (부등호/최댓값/증감 170문제)
        │
        ▼ (node build_calc_data.js 실행)
  [calc_data.js] -> const CALC_DATA = { div: [...], mul: [...], add_sub: [...], prob_1019: [...] };
        │
        ▼ (브라우저 로드)
  [index.html & app.js]
  - app.state.questions 에 로드
  - q.type 에 따라 적합한 렌더러 함수로 화면 분기
  - KaTeX + 자체 fallback 파서(app.formatMath)로 수학 수식 렌더링
  - IndexedDB (PSAT_DB / wrong_answers)에 오답 저장 및 7일간 복습
```

---

## 2. 파일별 역할 및 수정 대상

| 파일 경로 | 역할 | 신규 문제 추가 시 수정 여부 |
|---|---|---|
| `build_calc_data.js` | Raw JSON들을 파싱하여 단일 JS 파일(`calc_data.js`)로 번들링하는 빌드 스크립트 | **필수 수정** (새 파일 파싱 추가) |
| `calc_data.js` | 브라우저가 직접 로드하는 통합 계산 데이터 전역 객체 (`CALC_DATA`) | **빌드 스크립트 실행으로 자동 생성** |
| `index.html` | UI 레이아웃, 유형 선택 버튼 그리드, 세트 드롭다운 옵션 | **필요 시 수정** (새 유형 버튼/세트 추가 시) |
| `app.js` | 앱 상태 관리, 유형별 렌더러/채점/피드백 함수, 타이머, IndexedDB | **필요 시 수정** (새로운 유형 UI나 렌더러가 필요할 때) |
| `style.css` | 유형별 카드, 버튼, 테이블, 수식 레이아웃 스타일 | **필요 시 수정** (새 UI 요소 스타일링) |
| `sw.js` | PWA 오프라인 캐시 관리 | **필수 수정** (캐시 버전 `CACHE_NAME` 갱신) |

---

## 3. `CALC_DATA` 문제 객체 표준 스키마

`calc_data.js` 내 각 문제 객체(`item`)는 아래 필드를 표준으로 유지해야 합니다:

```typescript
interface CalcProblem {
  id: string;          // 고유 ID (예: 'div-1-1', 'prob1019-max-4')
  subject: 'calc';     // 항상 'calc'
  category: string;    // 'div' | 'mul' | 'add_sub' | 'prob_1019' | ... (세트 필터링용)
  set_id: number;      // 1-based 세트 번호 (세트별 풀이에 사용)
  prob_num: number;    // 세트 내 번호 (1 ~ N)
  type: string;        // 문제 유형 식별자 (렌더러 분기 기준)
  prob: string;        // 원본 문제 텍스트 또는 수식
  answer: string | number; // 정답 값
  detail: Record<string, any>; // 유형별 렌더링에 필요한 파싱된 상세 객체
}
```

### 지원되는 `type` 목록 및 `detail` 구조

1. **`inequality_comparison`** (부등호 3선다: `>`, `=`, `<`)
   - `answer`: `'>'` | `'='` | `'<'`
   - `detail`: `{ left_expr: string, right_expr: string }`
   - 수식에 `\frac{...}{...}` 등 LaTeX 표기 지원

2. **`max_selection`** (선택지 중 최댓값 선택)
   - `answer`: 선택지 중 최댓값 문자열 (예: `'\\frac{1,233}{60}'`)
   - `detail`: `{ choices: string[], max_value: string }`

3. **`trend_analysis`** (시계열 증감 추이 `+`, `=`, `-` 입력)
   - `answer`: 각 단계 부호 문자열 (예: `'++-'`, `'---+'`)
   - `detail`: `{ sequence: string[], expected_trend: string }`

4. **`division_comparison`** (분수 대소 비교)
   - `answer`: `'>'` | `'<'`
   - `detail`: `{ left_expr: "219/243", right_expr: "322/314", left_value: 0.9012, right_value: 1.0255 }`

5. **`multiplication_comparison`** (곱셈 대소 비교)
   - `answer`: `'>'` | `'<'`
   - `detail`: `{ left_expr: "7844 * 33.2", right_expr: "4100 * 55.5", left_value: 260420.8, right_value: 227550 }`

6. **`growth_matrix_comparison`** (2x2 증가율 매트릭스 비교)
   - `answer`: `'>'` | `'<'`
   - `detail`: `{ matrix: [[a, b], [c, d]], left_fraction: "...", right_fraction: "...", ... }`

7. **`fraction_ordering`** (분수 4개 순서 정렬)
   - `answer`: `"281/204 > 121/99 > 140/122 > 130/124"`
   - `detail`: `{ fractions: [...], values: [...], sorted_order: [...] }`

8. **`matrix_addition_*`** (표 빈칸 채우기)
   - `type`: `matrix_addition_category`, `matrix_addition_education`, `signed_matrix_addition_*` 등
   - `detail`: `{ headers: [...], row_labels: [...], grid: [[...]], blanks: [{ row, col, row_idx, col_idx, value }], given: [...] }`

---

## 4. 신규 문제 추가 Step-by-Step 작업 절차

새로운 JSON 파일(예: `new_dataset.json`)을 전달받았을 때 아래 순서대로 진행합니다.

### Step 1: Raw JSON 파일 구조 및 필드 점검
터미널에서 Node 명령으로 데이터 구조를 파악합니다:
```bash
node -e '
  const fs = require("fs");
  const data = JSON.parse(fs.readFileSync("new_dataset.json", "utf8"));
  console.log("IsArray?", Array.isArray(data), "Keys:", Object.keys(data));
  // 샘플 데이터 및 타입 확인
'
```

### Step 2: `build_calc_data.js` 파싱 로직 추가
`build_calc_data.js`에 새 JSON 파일을 읽고 파싱하는 블록을 추가합니다:
```javascript
const newRaw = JSON.parse(fs.readFileSync("new_dataset.json", "utf8"));
const newParsedList = [];

// 데이터 구조에 맞춰 파싱 및 standard schema로 변환
newRaw.forEach((item, idx) => {
  newParsedList.push({
    id: `newset-${item.id || idx + 1}`,
    subject: "calc",
    category: "new_category_name",
    set_id: Math.floor(idx / 10) + 1, // 필요에 따라 세트 분할
    prob_num: (idx % 10) + 1,
    type: "기존_type_사용_또는_새_type_정의",
    prob: item.problem || item.prob,
    answer: String(item.answer).trim(),
    detail: { ... }
  });
});

// calcData 객체에 포함
const calcData = {
  div: ...,
  mul: ...,
  add_sub: ...,
  prob_1019: ...,
  new_category: newParsedList,
};
```

### Step 3: 빌드 스크립트 실행
```bash
node build_calc_data.js
```
`calc_data.js`가 정상적으로 빌드되었는지 확인합니다:
```bash
node -e '
  const fs = require("fs");
  const fn = new Function(fs.readFileSync("calc_data.js", "utf8") + "; return CALC_DATA;");
  const data = fn();
  console.log("Keys:", Object.keys(data));
'
```

### Step 4: UI/UX 라우팅 확인 및 확장 (필요 시)

#### Case A. 기존에 이미 있는 유형을 재사용하는 경우:
- `app.js`의 `startRandomQuiz`와 `startReviewQuiz`의 풀(pool) 배열에 `...(CALC_DATA.new_category || [])`만 추가해주면 됩니다.
- `updateSetOptions()` 및 `startCalcSetQuiz()`에 새 카테고리 옵션을 추가합니다.
- `index.html`의 세트 선택 드롭다운에 `<option value="new_category">새 세트 이름</option>`을 추가합니다.

#### Case B. 완전히 새로운 UI/UX 형태의 문제 유형인 경우:
1. **`app.js`**:
   - `renderQuestion()`의 if-else 분기에 `else if (q.type === '새_type') { app.renderNewTypeQuestion(q, qArea); }` 추가
   - `renderNewTypeQuestion(q, container)` 함수 구현
   - 사용자 답안 체크 함수 `checkNewTypeAnswer(...)` 구현
   - 결과 피드백 표시 함수 `showNewTypeFeedback(...)` 구현
   - `restoreQuestionFeedback()`에 이전 문제로 돌아왔을 때의 복원 분기 추가
2. **`index.html`**:
   - `<template id="view-home-calc">`의 `.type-grid`에 신규 유형 바로가기 버튼 추가:
     ```html
     <button class="type-btn" onclick="app.startCalcTypeQuiz('새_type')">
       <span class="type-icon">아이콘</span>
       <span class="type-title">유형 제목</span>
     </button>
     ```
3. **`style.css`**:
   - 신규 유형에 필요한 카드, 버튼, 입력 인터페이스 스타일 작성

### Step 5: `sw.js` 서비스 워커 캐시 갱신
PWA 서비스 워커가 이전 버전을 캐시하고 있으면 사용자가 새로고침해도 새 데이터가 반영되지 않습니다.
`sw.js`의 `CACHE_NAME`을 `psat-v4`, `psat-v5` 등으로 버전을 올립니다:
```javascript
const CACHE_NAME = "psat-v4";
```

### Step 6: 종합 무결성 검증
```bash
# JS 문법 검사
node -c app.js
node -c build_calc_data.js
node -c sw.js

# 데이터셋 전체 로딩 검증
node -e '
  const fs = require("fs");
  const fn = new Function(fs.readFileSync("calc_data.js", "utf8") + "; return CALC_DATA;");
  const d = fn();
  let total = 0;
  for (const k of Object.keys(d)) {
    console.log(k, d[k].length);
    total += d[k].length;
  }
  console.log("Total problems:", total);
'
```

---

## 5. 핵심 주의사항 및 트러블슈팅

1. **LaTeX 수식 렌더링 (`app.formatMath`)**:
   - LaTeX 문자열(`\frac`, `\times` 등)이 포함된 문제는 반드시 `app.formatMath(str)`를 거쳐서 렌더링해야 합니다.
   - 브라우저에 `window.katex`가 있으면 KaTeX로 렌더링하고, 없으면 정규식 기반 fallback 분수 HTML이 자동 적용됩니다.

2. **오답 복습 ID 프리픽스 호환성 (`app.startReviewQuiz`)**:
   - IndexedDB의 `wrong_answers` 스토어에서 헌법 문제와 자료해석 문제를 구분할 때 ID 접두어를 체크합니다.
   - 새 문제의 ID도 반드시 `category-set-num` 또는 명확한 접두어(예: `newset-1-1`)를 가져야 하며, `app.startReviewQuiz()`의 필터링 조건에 새 접두어를 등록해야 합니다.

3. **제한 시간 타이머 (`app.state.settings.timeLimit`)**:
   - 퀴즈 모드에서 문제당 제한 시간이 설정되어 있을 수 있습니다.
   - 새로운 렌더러가 호출될 때 `renderQuestion()` 첫머리에서 `app.stopTimer()`가 호출되고, 렌더링 완료 후 미답변 상태일 때 `app.startTimer()`가 자동 동작하므로 새 렌더러 내부에서 타이머를 직접 조작할 필요가 없습니다. (단, 사용자가 정답 제출 시 반드시 `app.stopTimer()`를 호출해야 합니다.)
