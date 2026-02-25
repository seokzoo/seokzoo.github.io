const fs = require("fs")
const path = require("path")

const files = [
  "2017_헌법.json",
  "2018_헌법.json",
  "2019_헌법.json",
  "2020_헌법.json",
  "2021_헌법.json",
  "2022_헌법.json",
  "2023_헌법.json",
  "2024_헌법.json",
  "2025_헌법.json",
]

const allData = {}

files.forEach((file) => {
  const raw = fs.readFileSync(file, "utf8")
  const json = JSON.parse(raw)
  const year = json.year

  const processedQuestions = json.questions.map((q) => {
    let content = q.content
    const choices = []

    // Regex to find choices starting with circled numbers
    // Matches ① ... ② ... etc.
    // We split by the circled numbers.

    // First, check if circles exist
    const splitPattern = /([①②③④⑤])/
    const parts = content.split(splitPattern)

    let questionBody = parts[0].trim()

    // Remove markdown bold characters (**) from title if present
    questionBody = questionBody.replace(/^\*\*/, "").replace(/\*\*$/, "")

    // Parts will look like: ["Question text", "①", "Choice 1", "②", "Choice 2"...]
    if (parts.length > 1) {
      for (let i = 1; i < parts.length; i += 2) {
        // const marker = parts[i]; // ①
        const choiceText = parts[i + 1] ? parts[i + 1].trim() : ""
        choices.push(choiceText)
      }
    } else {
      // Fallback if parsing fails (unlikely based on sample, but safety first)
      // Just treat the whole content as body, no specific choice UI
      console.warn(`Warning: Could not parse choices for Year ${year} Q ${q.number}`)
    }

    return {
      id: `${year}-${q.number}`,
      number: q.number,
      question: questionBody,
      choices: choices,
      answer: q.answer,
      image: q.image,
    }
  })

  allData[year] = processedQuestions
})

const outputContent = `const PSAT_DATA = ${JSON.stringify(allData, null, 2)};`

fs.writeFileSync("data.js", outputContent)
console.log("data.js created successfully.")
