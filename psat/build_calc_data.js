const fs = require("fs")

const div = JSON.parse(fs.readFileSync("div.json", "utf8"))
const mul = JSON.parse(fs.readFileSync("mul.json", "utf8"))

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
}

const outputContent = `const CALC_DATA = ${JSON.stringify(calcData)};`
fs.writeFileSync("calc_data.js", outputContent)
console.log(
  `calc_data.js created successfully with ${calcData.div.length} div items and ${calcData.mul.length} mul items.`,
)
