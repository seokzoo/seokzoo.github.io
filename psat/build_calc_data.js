const fs = require("fs")

const div = JSON.parse(fs.readFileSync("div.json", "utf8"))
const mul = JSON.parse(fs.readFileSync("mul.json", "utf8"))
const addSub = JSON.parse(fs.readFileSync("add_sub.json", "utf8"))
const raw1019 = JSON.parse(fs.readFileSync("10_19_prob.json", "utf8"))

const prob1019List = []

// 1. 부등호 비교
if (raw1019["부등호 비교 (A vs B)"]) {
  raw1019["부등호 비교 (A vs B)"].problems.forEach((item) => {
    const parts = item.problem.split("\\text{ vs }").map((s) => s.trim())
    prob1019List.push({
      id: `prob1019-compare-${item.id}`,
      subject: "calc",
      category: "prob_1019",
      type: "inequality_comparison",
      prob: item.problem,
      answer: item.answer.trim(),
      detail: {
        left_expr: parts[0],
        right_expr: parts[1],
      },
    })
  })
}

// 2. 최댓값 선택
if (raw1019["최댓값 선택 (A vs B vs C ...)"]) {
  raw1019["최댓값 선택 (A vs B vs C ...)"].problems.forEach((item) => {
    const choices = item.problem.split("\\text{ vs }").map((s) => s.trim())
    prob1019List.push({
      id: `prob1019-max-${item.id}`,
      subject: "calc",
      category: "prob_1019",
      type: "max_selection",
      prob: item.problem,
      answer: item.answer.trim(),
      detail: {
        choices: choices,
        max_value: item.answer.trim(),
      },
    })
  })
}

// 3. 증감 추이
if (raw1019["증감 추이 (A → B → C ...)"]) {
  raw1019["증감 추이 (A → B → C ...)"].problems.forEach((item) => {
    const sequence = item.problem.split("\\rightarrow").map((s) => s.trim())
    prob1019List.push({
      id: `prob1019-trend-${item.id}`,
      subject: "calc",
      category: "prob_1019",
      type: "trend_analysis",
      prob: item.problem,
      answer: item.answer.trim(),
      detail: {
        sequence: sequence,
        expected_trend: item.answer.trim(),
      },
    })
  })
}

prob1019List.forEach((item, idx) => {
  item.set_id = Math.floor(idx / 10) + 1
  item.prob_num = (idx % 10) + 1
})

const calcData = {
  div: div.map((item) => ({
    id: `div-${item.set_id}-${item.prob_num}`,
    subject: "calc",
    category: "div",
    set_id: item.set_id,
    prob_num: item.prob_num,
    type: item.type,
    prob: item.prob,
    answer: item.answer,
    detail: item.detail,
  })),
  mul: mul.map((item) => ({
    id: `mul-${item.set_id}-${item.prob_num}`,
    subject: "calc",
    category: "mul",
    set_id: item.set_id,
    prob_num: item.prob_num,
    type: item.type,
    prob: item.prob,
    answer: item.answer,
    detail: item.detail,
  })),
  add_sub: addSub.map((item) => ({
    id: `add_sub-${item.set_id}-${item.prob_num}`,
    subject: "calc",
    category: "add_sub",
    set_id: item.set_id,
    prob_num: item.prob_num,
    type: item.type,
    prob: item.prob,
    answer: item.answer,
    detail: item.detail,
  })),
  prob_1019: prob1019List,
}

const outputContent = `const CALC_DATA = ${JSON.stringify(calcData)};`
fs.writeFileSync("calc_data.js", outputContent)
console.log(
  `calc_data.js created successfully with ${calcData.div.length} div, ${calcData.mul.length} mul, ${calcData.add_sub.length} add_sub, and ${calcData.prob_1019.length} prob_1019 items. Total: ${
    calcData.div.length + calcData.mul.length + calcData.add_sub.length + calcData.prob_1019.length
  }`,
)
