const app = {
  db: null,
  state: {
    subject: "constitution", // 'constitution' or 'calc'
    mode: "home", // 'home', 'quiz', 'result', 'stats'
    questions: [],
    currentIndex: 0,
    userAnswers: [],
    results: [],
    quizMode: "",
    quizInfo: "",
    startTime: null,
    settings: {
      timeLimit: 0, // 0 = unlimited, else seconds per question
    },
    timerInterval: null,
    timeLeft: 0,
    orderingSlots: [], // for fraction_ordering
  },

  init: async () => {
    app.loadSettings()
    await app.openDB()
    app.renderHome()
  },

  loadSettings: () => {
    try {
      const saved = localStorage.getItem("psat_settings")
      if (saved) {
        app.state.settings = JSON.parse(saved)
      }
    } catch (e) {
      console.warn("Failed to load settings from localStorage", e)
    }
  },

  saveSettings: () => {
    const timeSelect = document.getElementById("time-limit-select")
    let sec = parseInt(timeSelect.value, 10)
    if (timeSelect.value === "custom") {
      const customInput = document.getElementById("custom-time-input")
      sec = parseInt(customInput.value, 10) || 0
    }

    app.state.settings.timeLimit = sec
    localStorage.setItem("psat_settings", JSON.stringify(app.state.settings))
    app.closeSettings()
    alert(`설정이 저장되었습니다. (제한시간: ${sec > 0 ? sec + "초" : "제한없음"})`)
  },

  openSettings: () => {
    const modal = document.getElementById("settings-modal")
    const select = document.getElementById("time-limit-select")
    const customGroup = document.getElementById("custom-time-group")
    const customInput = document.getElementById("custom-time-input")

    const limit = app.state.settings.timeLimit
    const presetValues = ["0", "5", "10", "15", "20", "30", "60"]

    if (presetValues.includes(String(limit))) {
      select.value = String(limit)
      customGroup.classList.add("hidden")
    } else {
      select.value = "custom"
      customGroup.classList.remove("hidden")
      customInput.value = limit
    }

    modal.classList.remove("hidden")
  },

  closeSettings: () => {
    document.getElementById("settings-modal").classList.add("hidden")
  },

  handleTimeLimitChange: (val) => {
    const customGroup = document.getElementById("custom-time-group")
    if (val === "custom") {
      customGroup.classList.remove("hidden")
    } else {
      customGroup.classList.add("hidden")
    }
  },

  openDB: () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("PSAT_DB", 2)

      request.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains("history")) {
          const store = db.createObjectStore("history", { keyPath: "id" })
          store.createIndex("date", "date", { unique: false })
          store.createIndex("score", "score", { unique: false })
          store.createIndex("subject", "subject", { unique: false })
        }
        if (!db.objectStoreNames.contains("wrong_answers")) {
          const store = db.createObjectStore("wrong_answers", { keyPath: "id" })
          store.createIndex("date", "date", { unique: false })
          store.createIndex("subject", "subject", { unique: false })
        }
      }

      request.onsuccess = (e) => {
        app.db = e.target.result
        resolve()
      }

      request.onerror = (e) => reject(e)
    })
  },

  switchSubject: (subj) => {
    app.state.subject = subj
    document.querySelectorAll(".subj-btn").forEach((b) => b.classList.remove("active"))
    const activeBtn = document.getElementById(`subj-${subj}`)
    if (activeBtn) activeBtn.classList.add("active")

    const titleEl = document.getElementById("app-title")
    if (subj === "constitution") {
      titleEl.textContent = "PSAT 헌법"
    } else {
      titleEl.textContent = "PSAT 자료해석 (계산 연습)"
    }

    app.renderHome()
  },

  switchTab: (tabName) => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"))
    document.getElementById(`nav-${tabName}`).classList.add("active")

    if (tabName === "stats") {
      app.renderStats()
    } else {
      app.renderHome()
    }
  },

  showView: (templateId) => {
    const main = document.getElementById("main-content")
    const template = document.getElementById(templateId)
    main.innerHTML = ""
    main.appendChild(template.content.cloneNode(true))
  },

  renderHome: () => {
    app.state.mode = "home"
    app.stopTimer()

    if (app.state.subject === "constitution") {
      app.showView("view-home-constitution")
      const grid = document.getElementById("year-buttons")
      if (grid && typeof PSAT_DATA !== "undefined") {
        const years = Object.keys(PSAT_DATA).sort((a, b) => b - a)
        years.forEach((year) => {
          const btn = document.createElement("button")
          btn.className = "year-btn"
          btn.textContent = `${year}년`
          btn.onclick = () => app.startQuiz(year)
          grid.appendChild(btn)
        })
      }
    } else {
      app.showView("view-home-calc")
      app.updateSetOptions()
    }

    document.getElementById("nav-solve").classList.add("active")
    document.getElementById("nav-stats").classList.remove("active")
  },

  updateSetOptions: () => {
    const catSelect = document.getElementById("calc-category-select")
    const setSelect = document.getElementById("calc-set-select")
    if (!catSelect || !setSelect) return

    const category = catSelect.value
    setSelect.innerHTML = ""

    const catName = category === "div" ? "나눗셈" : category === "mul" ? "곱셈" : "덧뺄셈"

    for (let i = 1; i <= 50; i++) {
      const opt = document.createElement("option")
      opt.value = i
      opt.textContent = `Set ${i} (${catName})`
      setSelect.appendChild(opt)
    }
  },

  // Starters
  startQuiz: (year) => {
    const questions = PSAT_DATA[year]
    if (!questions) return
    app.setupQuizState(questions, "year", `${year}년 기출`)
  },

  startRandomQuiz: () => {
    if (app.state.subject === "constitution") {
      let allQ = []
      Object.keys(PSAT_DATA).forEach((y) => {
        allQ = allQ.concat(PSAT_DATA[y])
      })
      app.shuffle(allQ)
      const selected = allQ.slice(0, 25)
      app.setupQuizState(selected, "random", "무작위 모의고사")
    } else {
      let allQ = [...CALC_DATA.div, ...CALC_DATA.mul, ...(CALC_DATA.add_sub || [])]
      app.shuffle(allQ)
      const selected = allQ.slice(0, 20)
      app.setupQuizState(selected, "random", "무작위 모의고사 (20문제)")
    }
  },

  startCalcTypeQuiz: (type) => {
    let questions = []
    const all = [...CALC_DATA.div, ...CALC_DATA.mul, ...(CALC_DATA.add_sub || [])]
    if (type === "all") {
      questions = [...all]
    } else if (type === "matrix_addition") {
      questions = all.filter((item) => item.type.includes("matrix_addition"))
    } else {
      questions = all.filter((item) => item.type === type)
    }

    app.shuffle(questions)
    const selected = questions.slice(0, 20)

    const typeNames = {
      division_comparison: "분수 대소 비교",
      fraction_ordering: "분수 순서 정렬",
      multiplication_comparison: "곱셈 대소 비교",
      growth_matrix_comparison: "증가율 비교",
      matrix_addition: "덧뺄셈 표 빈칸 채우기",
      all: "전체 유형 혼합",
    }

    app.setupQuizState(selected, "calc_type", `유형별: ${typeNames[type] || type}`)
  },

  startCalcSetQuiz: () => {
    const category = document.getElementById("calc-category-select").value
    const setNum = parseInt(document.getElementById("calc-set-select").value, 10)

    let pool = CALC_DATA.div
    if (category === "mul") pool = CALC_DATA.mul
    else if (category === "add_sub") pool = CALC_DATA.add_sub || []

    const questions = pool.filter((item) => item.set_id === setNum)

    if (questions.length === 0) {
      alert("해당 세트 문제를 찾을 수 없습니다.")
      return
    }

    const catName = category === "div" ? "나눗셈" : category === "mul" ? "곱셈" : "덧뺄셈"
    const info = `Set ${setNum} (${catName})`
    app.setupQuizState(questions, "calc_set", info)
  },

  startReviewQuiz: async () => {
    const tx = app.db.transaction("wrong_answers", "readonly")
    const store = tx.objectStore("wrong_answers")
    const range = IDBKeyRange.lowerBound(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const index = store.index("date")

    const request = index.getAll(range)

    request.onsuccess = () => {
      const records = request.result || []
      const currentSubject = app.state.subject

      const filtered = records.filter((rec) => {
        if (rec.subject) return rec.subject === currentSubject
        // Fallback for older records
        return currentSubject === "constitution"
          ? !rec.id.startsWith("div-") && !rec.id.startsWith("mul-") && !rec.id.startsWith("add_sub-")
          : rec.id.startsWith("div-") || rec.id.startsWith("mul-") || rec.id.startsWith("add_sub-")
      })

      if (filtered.length === 0) {
        alert("최근 7일간 틀린 문제가 없습니다.")
        return
      }

      let questions = []
      if (currentSubject === "constitution") {
        filtered.forEach((rec) => {
          const [y, n] = rec.id.split("-")
          if (PSAT_DATA[y]) {
            const q = PSAT_DATA[y].find((item) => item.number == n)
            if (q) questions.push(q)
          }
        })
      } else {
        const allCalc = [...CALC_DATA.div, ...CALC_DATA.mul, ...(CALC_DATA.add_sub || [])]
        filtered.forEach((rec) => {
          if (rec.problemData) {
            questions.push(rec.problemData)
          } else {
            const q = allCalc.find((item) => item.id === rec.id)
            if (q) questions.push(q)
          }
        })
      }

      app.shuffle(questions)

      if (questions.length === 0) {
        alert("문제 데이터를 찾을 수 없습니다.")
        return
      }

      app.setupQuizState(questions, "review", "오답 복습")
    }
  },

  setupQuizState: (questions, mode, info) => {
    app.state.mode = "quiz"
    app.state.questions = questions
    app.state.currentIndex = 0
    app.state.userAnswers = new Array(questions.length).fill(null)
    app.state.results = new Array(questions.length).fill(null)
    app.state.quizMode = mode
    app.state.quizInfo = info
    app.state.startTime = Date.now()

    app.showView("view-quiz")
    app.renderQuestion()
  },

  renderQuestion: () => {
    app.stopTimer()
    app.state.orderingSlots = []

    const q = app.state.questions[app.state.currentIndex]
    const total = app.state.questions.length

    let displayInfo = app.state.quizInfo
    document.getElementById("quiz-info").textContent = `${displayInfo} (${app.state.currentIndex + 1}/${total})`

    const pct = (app.state.currentIndex / total) * 100
    document.getElementById("progress-fill").style.width = `${pct}%`

    const qArea = document.getElementById("question-area")
    qArea.innerHTML = ""

    const feedbackArea = document.getElementById("feedback-area")
    feedbackArea.innerHTML = ""
    feedbackArea.classList.add("hidden")

    document.getElementById("btn-prev").disabled = app.state.currentIndex === 0
    document.getElementById("btn-next").disabled = true

    // Render Question based on type
    if (!q.type || app.state.subject === "constitution") {
      app.renderConstitutionQuestion(q, qArea)
    } else if (q.type === "division_comparison" || q.type === "multiplication_comparison") {
      app.renderComparisonQuestion(q, qArea)
    } else if (q.type === "growth_matrix_comparison") {
      app.renderGrowthMatrixQuestion(q, qArea)
    } else if (q.type === "fraction_ordering") {
      app.renderFractionOrderingQuestion(q, qArea)
    } else if (q.type && q.type.includes("matrix_addition")) {
      app.renderMatrixAdditionQuestion(q, qArea)
    }

    // Restore state if answered
    const prevAns = app.state.userAnswers[app.state.currentIndex]
    if (prevAns !== null) {
      app.restoreQuestionFeedback(q, prevAns)
    } else {
      // Start timer if setting enabled
      if (app.state.settings.timeLimit > 0) {
        app.startTimer()
      } else {
        document.getElementById("quiz-timer").classList.add("hidden")
      }
    }
  },

  // 1. Constitution Question Render
  renderConstitutionQuestion: (q, container) => {
    let html = `<div class="q-title">${q.question}</div>`
    if (q.image) {
      html += `<div class="q-image-container"><img src="${q.image}" class="q-image" alt="Problem Image"></div>`
    }
    html += `<div class="choice-list">`
    q.choices.forEach((choice, idx) => {
      html += `<div class="choice-item" id="choice-${idx}" onclick="app.checkAnswer(${idx})">
                <span style="margin-right: 8px; font-weight: bold;">${idx + 1}.</span>
                <span>${choice}</span>
            </div>`
    })
    html += `</div>`
    container.innerHTML = html
  },

  // 2. Comparison Question Render (Division / Multiplication)
  renderComparisonQuestion: (q, container) => {
    let leftHtml = ""
    let rightHtml = ""

    if (q.type === "division_comparison") {
      const [leftNum, leftDen] = q.detail.left_expr.split("/")
      const [rightNum, rightDen] = q.detail.right_expr.split("/")

      leftHtml = `<div class="fraction-display">
                    <span class="numerator">${leftNum}</span>
                    <div class="fraction-line"></div>
                    <span class="denominator">${leftDen}</span>
                  </div>`
      rightHtml = `<div class="fraction-display">
                    <span class="numerator">${rightNum}</span>
                    <div class="fraction-line"></div>
                    <span class="denominator">${rightDen}</span>
                  </div>`
    } else {
      const leftExpr = q.detail.left_expr.replace("*", "×")
      const rightExpr = q.detail.right_expr.replace("*", "×")

      leftHtml = `<div class="multiplication-display">${leftExpr}</div>`
      rightHtml = `<div class="multiplication-display">${rightExpr}</div>`
    }

    const html = `
      <div class="q-title">두 수식의 크기를 비교하세요.</div>
      <div class="comp-container">
        <div class="comp-card">${leftHtml}</div>
        <div class="comp-vs">VS</div>
        <div class="comp-card">${rightHtml}</div>
      </div>
      <div class="comp-actions">
        <button id="comp-btn-gt" class="comp-btn" onclick="app.checkComparisonAnswer('>')">&gt;</button>
        <button id="comp-btn-lt" class="comp-btn" onclick="app.checkComparisonAnswer('<')">&lt;</button>
      </div>
    `
    container.innerHTML = html
  },

  // 3. Growth Matrix Question Render
  renderGrowthMatrixQuestion: (q, container) => {
    const matrix = q.detail.matrix || [[0, 0], [0, 0]]
    const html = `
      <div class="q-title">다음 매트릭스의 행별 증가율(또는 비율)을 비교하세요.</div>
      <div class="matrix-container">
        <div class="table-responsive">
          <table class="matrix-table">
            <thead>
              <tr>
                <th>구분</th>
                <th>시점 A</th>
                <th>시점 B</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Row 1</strong></td>
                <td>${matrix[0][0]}</td>
                <td>${matrix[0][1]}</td>
              </tr>
              <tr>
                <td><strong>Row 2</strong></td>
                <td>${matrix[1][0]}</td>
                <td>${matrix[1][1]}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div class="sub-text" style="text-align: center; font-weight: 600;">
        비교: (${q.detail.left_fraction}) VS (${q.detail.right_fraction})
      </div>
      <div class="comp-actions">
        <button id="comp-btn-gt" class="comp-btn" onclick="app.checkComparisonAnswer('>')">&gt;</button>
        <button id="comp-btn-lt" class="comp-btn" onclick="app.checkComparisonAnswer('<')">&lt;</button>
      </div>
    `
    container.innerHTML = html
  },

  // 4. Fraction Ordering Question Render
  renderFractionOrderingQuestion: (q, container) => {
    const fractions = q.detail.fractions || []
    app.state.orderingSlots = new Array(fractions.length).fill(null)

    let html = `
      <div class="q-title">다음 분수들을 <strong>큰 순서대로 (1등 ~ ${fractions.length}등)</strong> 정렬하세요.</div>
      <div class="ordering-container">
        <div class="slots-header">현재 선택된 순서 (큰 순서대로):</div>
        <div class="ordering-slots" id="ordering-slots-area">
          ${fractions
            .map(
              (_, i) => `
            <div class="ordering-slot" id="slot-${i}" onclick="app.removeFromSlot(${i})">
              <span class="slot-rank">${i + 1}등</span>
              <span class="slot-val" id="slot-val-${i}">-</span>
            </div>
          `,
            )
            .join("")}
        </div>

        <div class="pool-header">분수 선택 (클릭하여 순서대로 배치):</div>
        <div class="candidate-pool" id="candidate-pool-area">
          ${fractions
            .map(
              (f, i) => `
            <button class="ordering-chip" id="chip-${i}" onclick="app.addToNextSlot('${f}', ${i})">${f}</button>
          `,
            )
            .join("")}
        </div>

        <div class="ordering-actions">
          <button class="btn-reset" onclick="app.resetOrderingSlots()">초기화</button>
          <button id="btn-submit-ordering" class="btn-submit" onclick="app.checkOrderingAnswer()" disabled>정답 제출</button>
        </div>
      </div>
    `
    container.innerHTML = html
  },

  // 5. Matrix Addition Fill-in-the-blanks Render (add_sub.json)
  renderMatrixAdditionQuestion: (q, container) => {
    const headers = q.detail.headers || []
    const rowLabels = q.detail.row_labels || []
    const grid = q.detail.grid || []
    const blanks = q.detail.blanks || []

    // Build lookup map for blanks: "row_idx,col_idx" -> blankObj
    const blankMap = {}
    blanks.forEach((b) => {
      blankMap[`${b.row_idx},${b.col_idx}`] = b
    })

    let tableHtml = `<div class="table-responsive"><table class="matrix-table"><thead><tr><th>구분</th>`
    headers.forEach((h) => {
      tableHtml += `<th>${h}</th>`
    })
    tableHtml += `</tr></thead><tbody>`

    rowLabels.forEach((rLabel, rIdx) => {
      tableHtml += `<tr><td><strong>${rLabel}</strong></td>`
      headers.forEach((cLabel, cIdx) => {
        const key = `${rIdx},${cIdx}`
        const blankObj = blankMap[key]

        if (blankObj) {
          tableHtml += `<td id="cell-container-${rIdx}-${cIdx}">
            <input type="number" 
                   class="matrix-blank-input" 
                   id="blank-${rIdx}-${cIdx}" 
                   data-row-idx="${rIdx}" 
                   data-col-idx="${cIdx}" 
                   data-correct="${blankObj.value}" 
                   data-row-name="${blankObj.row}" 
                   data-col-name="${blankObj.col}"
                   placeholder="?">
          </td>`
        } else {
          const val = grid[rIdx] ? grid[rIdx][cIdx] : ""
          tableHtml += `<td>${val}</td>`
        }
      })
      tableHtml += `</tr>`
    })

    tableHtml += `</tbody></table></div>`

    const html = `
      <div class="q-title">다음 표의 빈칸 <strong>[ ? ]</strong> 에 알맞은 숫자를 계산하여 입력하세요.</div>
      <div class="matrix-container">${tableHtml}</div>
      <div class="ordering-actions" style="margin-top: 1rem;">
        <button class="btn-reset" onclick="app.resetMatrixInputs()">초기화</button>
        <button id="btn-submit-matrix" class="btn-submit" onclick="app.checkMatrixBlankAnswer()">정답 제출</button>
      </div>
    `
    container.innerHTML = html
  },

  // Reset Matrix Inputs
  resetMatrixInputs: () => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return
    document.querySelectorAll(".matrix-blank-input").forEach((inp) => {
      inp.value = ""
    })
  },

  // Ordering Interactions
  addToNextSlot: (fractionStr, chipIdx) => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return

    const slots = app.state.orderingSlots
    const emptyIdx = slots.indexOf(null)
    if (emptyIdx === -1) return

    slots[emptyIdx] = { val: fractionStr, chipIdx: chipIdx }
    document.getElementById(`slot-val-${emptyIdx}`).textContent = fractionStr
    document.getElementById(`slot-${emptyIdx}`).classList.add("filled")
    document.getElementById(`chip-${chipIdx}`).classList.add("used")

    app.updateSubmitButtonState()
  },

  removeFromSlot: (slotIdx) => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return

    const item = app.state.orderingSlots[slotIdx]
    if (!item) return

    app.state.orderingSlots[slotIdx] = null
    document.getElementById(`slot-val-${slotIdx}`).textContent = "-"
    document.getElementById(`slot-${slotIdx}`).classList.remove("filled")
    document.getElementById(`chip-${item.chipIdx}`).classList.remove("used")

    app.updateSubmitButtonState()
  },

  resetOrderingSlots: () => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return

    const q = app.state.questions[app.state.currentIndex]
    const count = q.detail.fractions.length
    for (let i = 0; i < count; i++) {
      app.removeFromSlot(i)
    }
  },

  updateSubmitButtonState: () => {
    const btn = document.getElementById("btn-submit-ordering")
    if (!btn) return
    const isFull = app.state.orderingSlots.every((s) => s !== null)
    btn.disabled = !isFull
  },

  // Check Answers
  checkAnswer: (selectedIdx) => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return
    app.stopTimer()

    const q = app.state.questions[app.state.currentIndex]
    const correctIdx = q.answer - 1

    app.state.userAnswers[app.state.currentIndex] = selectedIdx
    const isCorrect = selectedIdx === correctIdx
    app.state.results[app.state.currentIndex] = isCorrect

    app.showConstitutionFeedback(selectedIdx, correctIdx, isCorrect)
    document.getElementById("btn-next").disabled = false
  },

  checkComparisonAnswer: (selectedSymbol) => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return
    app.stopTimer()

    const q = app.state.questions[app.state.currentIndex]
    const correctSymbol = q.answer
    const isCorrect = selectedSymbol === correctSymbol

    app.state.userAnswers[app.state.currentIndex] = selectedSymbol
    app.state.results[app.state.currentIndex] = isCorrect

    app.showComparisonFeedback(q, selectedSymbol, correctSymbol, isCorrect)
    document.getElementById("btn-next").disabled = false
  },

  checkOrderingAnswer: () => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return
    app.stopTimer()

    const q = app.state.questions[app.state.currentIndex]
    const userArray = app.state.orderingSlots.map((s) => s.val)
    const userOrderStr = userArray.join(" > ")
    const correctOrderStr = q.detail.sorted_order.join(" > ")

    const isCorrect = userOrderStr === correctOrderStr
    app.state.userAnswers[app.state.currentIndex] = userOrderStr
    app.state.results[app.state.currentIndex] = isCorrect

    app.showOrderingFeedback(q, userOrderStr, correctOrderStr, isCorrect)
    document.getElementById("btn-next").disabled = false
  },

  checkMatrixBlankAnswer: () => {
    if (app.state.userAnswers[app.state.currentIndex] !== null) return
    app.stopTimer()

    const q = app.state.questions[app.state.currentIndex]
    const inputs = document.querySelectorAll(".matrix-blank-input")

    const userAnsMap = {}
    let correctCount = 0
    let totalBlanks = inputs.length

    inputs.forEach((inp) => {
      const rIdx = inp.dataset.rowIdx
      const cIdx = inp.dataset.colIdx
      const rName = inp.dataset.rowName
      const cName = inp.dataset.colName
      const correctVal = parseInt(inp.dataset.correct, 10)
      const userVal = parseInt(inp.value, 10)

      const isBlankCorrect = !isNaN(userVal) && userVal === correctVal
      if (isBlankCorrect) correctCount++

      userAnsMap[`${rIdx},${cIdx}`] = {
        userVal: inp.value,
        correctVal: correctVal,
        isCorrect: isBlankCorrect,
        keyName: `${rName}_${cName}`,
      }
    })

    const isAllCorrect = correctCount === totalBlanks
    app.state.userAnswers[app.state.currentIndex] = userAnsMap
    app.state.results[app.state.currentIndex] = isAllCorrect

    app.showMatrixAdditionFeedback(q, userAnsMap, correctCount, totalBlanks, isAllCorrect)
    document.getElementById("btn-next").disabled = false
  },

  // Timeout Answer Handler
  handleTimeout: () => {
    app.stopTimer()
    if (app.state.userAnswers[app.state.currentIndex] !== null) return

    app.state.userAnswers[app.state.currentIndex] = "TIMEOUT"
    app.state.results[app.state.currentIndex] = false

    const feedbackArea = document.getElementById("feedback-area")
    feedbackArea.innerHTML = `
      <div class="calc-feedback-card wrong">
        ⏰ <strong>제한 시간이 초과되었습니다!</strong> 오답 처리 후 다음 문제로 이동합니다.
      </div>
    `
    feedbackArea.classList.remove("hidden")

    setTimeout(() => {
      app.nextQuestion()
    }, 900)
  },

  // Feedback Displays
  showConstitutionFeedback: (selectedIdx, correctIdx, isCorrect) => {
    const choices = document.querySelectorAll(".choice-item")
    choices.forEach((c) => (c.style.pointerEvents = "none"))

    if (isCorrect) {
      document.getElementById(`choice-${selectedIdx}`).classList.add("correct")
    } else {
      document.getElementById(`choice-${selectedIdx}`).classList.add("selected-wrong")
      document.getElementById(`choice-${correctIdx}`).classList.add("actual-answer-red")
    }
  },

  showComparisonFeedback: (q, selectedSymbol, correctSymbol, isCorrect) => {
    const btnGt = document.getElementById("comp-btn-gt")
    const btnLt = document.getElementById("comp-btn-lt")
    if (btnGt) btnGt.style.pointerEvents = "none"
    if (btnLt) btnLt.style.pointerEvents = "none"

    const selectedBtn = selectedSymbol === ">" ? btnGt : btnLt
    const correctBtn = correctSymbol === ">" ? btnGt : btnLt

    if (isCorrect) {
      if (selectedBtn) selectedBtn.classList.add("correct")
    } else {
      if (selectedBtn) selectedBtn.classList.add("selected-wrong")
      if (correctBtn) correctBtn.classList.add("correct")
    }

    const feedbackArea = document.getElementById("feedback-area")
    let detailText = ""

    if (q.type === "division_comparison") {
      detailText = `
        <li><strong>좌측 (${q.detail.left_expr})</strong> ≈ ${q.detail.left_value}</li>
        <li><strong>우측 (${q.detail.right_expr})</strong> ≈ ${q.detail.right_value}</li>
      `
    } else if (q.type === "multiplication_comparison") {
      detailText = `
        <li><strong>좌측 (${q.detail.left_expr})</strong> = ${q.detail.left_value.toLocaleString()}</li>
        <li><strong>우측 (${q.detail.right_expr})</strong> = ${q.detail.right_value.toLocaleString()}</li>
      `
    } else if (q.type === "growth_matrix_comparison") {
      detailText = `
        <li><strong>좌측 비율 (${q.detail.left_fraction})</strong> ≈ ${q.detail.left_val} (Row 1 증가율: ${q.detail.row1_growth_pct})</li>
        <li><strong>우측 비율 (${q.detail.right_fraction})</strong> ≈ ${q.detail.right_val} (Row 2 증가율: ${q.detail.row2_growth_pct})</li>
      `
    }

    feedbackArea.innerHTML = `
      <div class="calc-feedback-card ${isCorrect ? "correct" : "wrong"}">
        <div><strong>${isCorrect ? "🎉 정답입니다!" : "❌ 오답입니다."}</strong> (정답: <strong>${correctSymbol}</strong>)</div>
        <ul class="feedback-detail-list">
          ${detailText}
        </ul>
      </div>
    `
    feedbackArea.classList.remove("hidden")
  },

  showOrderingFeedback: (q, userOrderStr, correctOrderStr, isCorrect) => {
    document.querySelectorAll(".ordering-chip, .ordering-slot, .btn-reset, .btn-submit").forEach((el) => {
      el.style.pointerEvents = "none"
    })

    const fractions = q.detail.fractions || []
    const values = q.detail.values || []

    let valList = ""
    fractions.forEach((f, idx) => {
      valList += `<li><strong>${f}</strong> ≈ ${values[idx]}</li>`
    })

    const feedbackArea = document.getElementById("feedback-area")
    feedbackArea.innerHTML = `
      <div class="calc-feedback-card ${isCorrect ? "correct" : "wrong"}">
        <div><strong>${isCorrect ? "🎉 정답입니다!" : "❌ 오답입니다."}</strong></div>
        <div style="margin-top: 4px;"><strong>제출 순서:</strong> ${userOrderStr}</div>
        <div><strong>실제 정답:</strong> ${correctOrderStr}</div>
        <div style="margin-top: 6px; font-weight: 600;">[수치 계산 상세]</div>
        <ul class="feedback-detail-list">
          ${valList}
        </ul>
      </div>
    `
    feedbackArea.classList.remove("hidden")
  },

  showMatrixAdditionFeedback: (q, userAnsMap, correctCount, totalBlanks, isAllCorrect) => {
    const inputs = document.querySelectorAll(".matrix-blank-input")
    const resetBtn = document.querySelector(".btn-reset")
    const submitBtn = document.getElementById("btn-submit-matrix")

    if (resetBtn) resetBtn.style.pointerEvents = "none"
    if (submitBtn) submitBtn.style.pointerEvents = "none"

    inputs.forEach((inp) => {
      inp.readOnly = true
      const rIdx = inp.dataset.rowIdx
      const cIdx = inp.dataset.colIdx
      const key = `${rIdx},${cIdx}`
      const info = userAnsMap[key]

      if (info && info.isCorrect) {
        inp.classList.add("correct")
      } else {
        inp.classList.add("wrong")
        const container = document.getElementById(`cell-container-${rIdx}-${cIdx}`)
        if (container && !container.querySelector(".correct-hint")) {
          const hint = document.createElement("span")
          hint.className = "correct-hint"
          hint.textContent = `(${info ? info.correctVal : inp.dataset.correct})`
          container.appendChild(hint)
        }
      }
    })

    // Breakdown list
    const blanks = q.detail.blanks || []
    let listHtml = ""
    blanks.forEach((b) => {
      listHtml += `<li><strong>${b.row} - ${b.col}:</strong> ${b.value}</li>`
    })

    const feedbackArea = document.getElementById("feedback-area")
    feedbackArea.innerHTML = `
      <div class="calc-feedback-card ${isAllCorrect ? "correct" : "wrong"}">
        <div><strong>${isAllCorrect ? "🎉 완벽합니다! (모든 빈칸 정답)" : `❌ ${totalBlanks}개 중 ${correctCount}개 정답`}</strong></div>
        <div style="margin-top: 6px; font-weight: 600;">[전체 빈칸 정답 목록]</div>
        <ul class="feedback-detail-list">
          ${listHtml}
        </ul>
      </div>
    `
    feedbackArea.classList.remove("hidden")
  },

  restoreQuestionFeedback: (q, prevAns) => {
    const isCorrect = app.state.results[app.state.currentIndex]

    if (!q.type || app.state.subject === "constitution") {
      app.showConstitutionFeedback(prevAns, q.answer - 1, isCorrect)
    } else if (q.type === "fraction_ordering") {
      app.showOrderingFeedback(q, prevAns, q.detail.sorted_order.join(" > "), isCorrect)
    } else if (q.type && q.type.includes("matrix_addition")) {
      const blanks = q.detail.blanks || []
      app.showMatrixAdditionFeedback(q, prevAns || {}, isCorrect ? blanks.length : 0, blanks.length, isCorrect)
    } else {
      app.showComparisonFeedback(q, prevAns, q.answer, isCorrect)
    }
    document.getElementById("btn-next").disabled = false
  },

  // Timer Control
  startTimer: () => {
    app.stopTimer()
    const timerBadge = document.getElementById("quiz-timer")
    const timerSec = document.getElementById("timer-sec")
    const timerProgress = document.getElementById("timer-progress-fill")

    const limit = app.state.settings.timeLimit
    app.state.timeLeft = limit

    timerBadge.classList.remove("hidden")
    timerSec.textContent = limit
    if (timerProgress) timerProgress.style.width = "0%"

    app.state.timerInterval = setInterval(() => {
      app.state.timeLeft--
      timerSec.textContent = app.state.timeLeft

      if (timerProgress) {
        const pct = ((limit - app.state.timeLeft) / limit) * 100
        timerProgress.style.width = `${pct}%`
      }

      if (app.state.timeLeft <= 0) {
        app.handleTimeout()
      }
    }, 1000)
  },

  stopTimer: () => {
    if (app.state.timerInterval) {
      clearInterval(app.state.timerInterval)
      app.state.timerInterval = null
    }
    const timerBadge = document.getElementById("quiz-timer")
    if (timerBadge) timerBadge.classList.add("hidden")
    const timerProgress = document.getElementById("timer-progress-fill")
    if (timerProgress) timerProgress.style.width = "0%"
  },

  // Quiz Navigation
  nextQuestion: () => {
    if (app.state.currentIndex < app.state.questions.length - 1) {
      app.state.currentIndex++
      app.renderQuestion()
    } else {
      app.finishQuiz()
    }
  },

  prevQuestion: () => {
    if (app.state.currentIndex > 0) {
      app.state.currentIndex--
      app.renderQuestion()
    }
  },

  finishQuiz: async () => {
    app.stopTimer()
    app.state.mode = "result"

    const total = app.state.questions.length
    const correctCount = app.state.results.filter((r) => r).length
    const score = Math.round((correctCount / total) * 100)
    const currentSubject = app.state.subject

    const tx = app.db.transaction(["history", "wrong_answers"], "readwrite")

    const historyStore = tx.objectStore("history")
    historyStore.add({
      id: Date.now(),
      date: new Date().toLocaleString(),
      score: score,
      mode: app.state.quizMode,
      subject: currentSubject,
      details: app.state.results,
    })

    const wrongStore = tx.objectStore("wrong_answers")
    app.state.results.forEach((isCorrect, idx) => {
      if (!isCorrect) {
        const q = app.state.questions[idx]
        wrongStore.put({
          id: q.id,
          date: Date.now(),
          subject: currentSubject,
          problemData: currentSubject === "calc" ? q : null,
        })
      }
    })

    app.showView("view-result")
    document.getElementById("result-score").textContent = score
    document.getElementById("result-date").textContent = new Date().toLocaleString()

    const list = document.getElementById("result-list")
    app.state.results.forEach((isCorrect, idx) => {
      const div = document.createElement("div")
      div.className = `res-item ${isCorrect ? "correct" : "wrong"}`
      div.textContent = idx + 1
      list.appendChild(div)
    })
  },

  goHome: () => {
    app.renderHome()
  },

  quitQuiz: () => {
    if (confirm("퀴즈를 종료하시겠습니까? 기록이 저장되지 않습니다.")) {
      app.stopTimer()
      app.renderHome()
    }
  },

  renderStats: () => {
    app.state.mode = "stats"
    app.stopTimer()
    app.showView("view-stats")

    document.getElementById("nav-solve").classList.remove("active")
    document.getElementById("nav-stats").classList.add("active")

    const tx = app.db.transaction("history", "readonly")
    const store = tx.objectStore("history")
    const index = store.index("date")
    const request = index.getAll()

    request.onsuccess = () => {
      const allData = request.result || []
      const currentSubject = app.state.subject

      const data = allData.filter((item) => item.subject === currentSubject || (!item.subject && currentSubject === "constitution"))

      const grouped = data.reduce((acc, item) => {
        const d = new Date(item.id)
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
        if (!acc[dateKey]) {
          acc[dateKey] = { totalScore: 0, count: 0, timestamp: item.id }
        }
        acc[dateKey].totalScore += item.score
        acc[dateKey].count += 1
        return acc
      }, {})

      const averagedData = Object.entries(grouped).map(([date, val]) => ({
        date,
        score: Math.round(val.totalScore / val.count),
        count: val.count,
        timestamp: val.timestamp,
      }))

      averagedData.sort((a, b) => a.timestamp - b.timestamp)
      const recent = averagedData.slice(-20)

      const chartContainer = document.getElementById("score-chart")
      chartContainer.innerHTML = ""
      recent.forEach((item) => {
        const group = document.createElement("div")
        group.className = "chart-bar-group"

        const bar = document.createElement("div")
        bar.className = "chart-bar"
        bar.style.height = `${item.score}%`
        bar.dataset.score = item.score

        const tooltipText = item.count > 1 ? `평균 ${item.score}점 (${item.count}회 응시, ${item.date})` : `${item.score}점 (${item.date})`
        bar.title = tooltipText

        if (item.score >= 80) bar.style.background = "#10b981"
        else if (item.score >= 60) bar.style.background = "#f59e0b"
        else bar.style.background = "#ef4444"

        const label = document.createElement("div")
        label.className = "chart-label"
        const dateObj = new Date(item.timestamp)
        label.textContent = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`

        group.appendChild(bar)
        group.appendChild(label)
        chartContainer.appendChild(group)
      })

      const rankList = document.getElementById("rank-list")
      const sortedByScore = [...data].sort((a, b) => b.score - a.score)
      const top10 = sortedByScore.slice(0, 10)

      rankList.innerHTML = ""
      top10.forEach((item, idx) => {
        const li = document.createElement("li")
        li.className = "rank-item"
        const d = new Date(item.id)
        const dateStr = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
        li.innerHTML = `
          <span class="rank-rank">${idx + 1}</span>
          <span class="rank-date">${dateStr}</span>
          <span class="rank-score">${item.score}점</span>
        `
        rankList.appendChild(li)
      })
    }
  },

  shuffle: (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[array[i], array[j]] = [array[j], array[i]]
    }
  },
}

window.addEventListener("DOMContentLoaded", () => {
  app.init()
})
