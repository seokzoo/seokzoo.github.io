const app = {
    db: null,
    state: {
        mode: 'home', // home, quiz, result, stats
        questions: [],
        currentIndex: 0,
        userAnswers: [], // Array of selected indices
        results: [], // Array of booleans
        quizMode: '', // 'year', 'random', 'review'
        quizInfo: '',
        startTime: null
    },

    init: async () => {
        await app.openDB();
        app.renderHome();
    },

    openDB: () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('PSAT_DB', 1);

            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('history')) {
                    const store = db.createObjectStore('history', { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('score', 'score', { unique: false });
                }
                if (!db.objectStoreNames.contains('wrong_answers')) {
                    const store = db.createObjectStore('wrong_answers', { keyPath: 'id' });
                    store.createIndex('date', 'date', { unique: false });
                }
            };

            request.onsuccess = (e) => {
                app.db = e.target.result;
                resolve();
            };

            request.onerror = (e) => reject(e);
        });
    },

    switchTab: (tabName) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`nav-${tabName}`).classList.add('active');

        if (tabName === 'stats') {
            app.renderStats();
        } else {
            // If we are in quiz or result, stay there. If in stats, go home or last state?
            // Simple logic: If currently in stats, go home. If in quiz/result, just show it (it's hidden by main content swap usually, but here we are SPA).
            // Actually, we should just decide what to show.
            if (app.state.mode === 'stats') {
                app.renderHome();
            } else {
                // If we are already in solve flow (home, quiz, result), do nothing, just update tab UI.
                // But if we clicked 'Solve' tab while in 'Stats', we need to go back to where we were?
                // For simplicity: Go to Home if we were in Stats.
                app.renderHome();
            }
        }
    },

    showView: (templateId) => {
        const main = document.getElementById('main-content');
        const template = document.getElementById(templateId);
        main.innerHTML = '';
        main.appendChild(template.content.cloneNode(true));
    },

    renderHome: () => {
        app.state.mode = 'home';
        app.showView('view-home');
        
        const grid = document.getElementById('year-buttons');
        // PSAT_DATA is global from data.js
        const years = Object.keys(PSAT_DATA).sort((a, b) => b - a);

        years.forEach(year => {
            const btn = document.createElement('button');
            btn.className = 'year-btn';
            btn.textContent = `${year}년`;
            btn.onclick = () => app.startQuiz(year);
            grid.appendChild(btn);
        });
        
        // Update Tab UI
        document.getElementById('nav-solve').classList.add('active');
        document.getElementById('nav-stats').classList.remove('active');
    },

    startQuiz: (year) => {
        const questions = PSAT_DATA[year];
        if (!questions) return;
        
        app.setupQuizState(questions, 'year', `${year}년 기출`);
    },

    startRandomQuiz: () => {
        let allQ = [];
        Object.keys(PSAT_DATA).forEach(y => {
            allQ = allQ.concat(PSAT_DATA[y]);
        });
        
        // Shuffle
        for (let i = allQ.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allQ[i], allQ[j]] = [allQ[j], allQ[i]];
        }
        
        const selected = allQ.slice(0, 25);
        app.setupQuizState(selected, 'random', '무작위 모의고사');
    },

    startReviewQuiz: async () => {
        // Fetch wrong answers from last 7 days
        const tx = app.db.transaction('wrong_answers', 'readonly');
        const store = tx.objectStore('wrong_answers');
        const range = IDBKeyRange.lowerBound(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const index = store.index('date');
        
        const request = index.getAll(range);
        
        request.onsuccess = () => {
            const records = request.result;
            if (!records || records.length === 0) {
                alert('최근 7일간 틀린 문제가 없습니다.');
                return;
            }

            // Map IDs back to questions
            let questions = [];
            records.forEach(rec => {
                // rec.id format: "2024-1" or just find it
                // My data.js has ids like "2024-1".
                const [y, n] = rec.id.split('-');
                if (PSAT_DATA[y]) {
                    const q = PSAT_DATA[y].find(item => item.number == n);
                    if (q) questions.push(q);
                }
            });

            // Shuffle review questions
            for (let i = questions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [questions[i], questions[j]] = [questions[j], questions[i]];
            }

            if (questions.length === 0) {
                 alert('문제 데이터를 찾을 수 없습니다.');
                 return;
            }

            app.setupQuizState(questions, 'review', '오답 복습');
        };
    },

    setupQuizState: (questions, mode, info) => {
        app.state.mode = 'quiz';
        app.state.questions = questions;
        app.state.currentIndex = 0;
        app.state.userAnswers = new Array(questions.length).fill(null);
        app.state.results = new Array(questions.length).fill(null);
        app.state.quizMode = mode;
        app.state.quizInfo = info;
        app.state.startTime = Date.now();
        
        app.showView('view-quiz');
        app.renderQuestion();
    },

    renderQuestion: () => {
        const q = app.state.questions[app.state.currentIndex];
        const total = app.state.questions.length;
        const year = q.id.split('-')[0];
        
        let displayInfo = app.state.quizInfo;
        if (app.state.quizMode === 'random' || app.state.quizMode === 'review') {
            displayInfo = `${app.state.quizInfo} [${year}년]`;
        }
        
        document.getElementById('quiz-info').textContent = `${displayInfo} (${app.state.currentIndex + 1}/${total})`;
        
        // Update Progress
        const pct = ((app.state.currentIndex) / total) * 100;
        document.getElementById('progress-fill').style.width = `${pct}%`;

        // Render Text
        const qArea = document.getElementById('question-area');
        
        // Sanitize check? Content is from our JSON, safe enough for this context.
        // We need to render choices.
        let html = `<div class="q-text">${q.question}</div>`;
        
        if (q.image) {
            html += `<div class="q-image-container"><img src="${q.image}" class="q-image" alt="Problem Image"></div>`;
        }

        html += `<div class="choice-list">`;
        q.choices.forEach((choice, idx) => {
            // Choice index is 0-based here, but data might assume 1-based (answer is 1-5).
            // We'll display numbers 1..5
            html += `<div class="choice-item" id="choice-${idx}" onclick="app.checkAnswer(${idx})">
                <span style="margin-right: 8px; font-weight: bold;">${idx + 1}.</span>
                <span>${choice}</span>
            </div>`;
        });
        html += `</div>`;
        
        qArea.innerHTML = html;

        // Reset Feedback
        document.getElementById('feedback-area').classList.add('hidden');
        document.getElementById('btn-next').disabled = true;
        
        // Restore state if already answered (though instructions imply "one by one", maybe we don't allow going back to change? 
        // "Immediate feedback" implies once answered, it's done.
        // But if I go "Prev", I should see what I did.
        const prevAns = app.state.userAnswers[app.state.currentIndex];
        if (prevAns !== null) {
            app.showFeedback(prevAns);
        } else {
            // Enable interaction
            const choices = document.querySelectorAll('.choice-item');
            choices.forEach(c => c.style.pointerEvents = 'auto');
        }
    },

    checkAnswer: (selectedIdx) => {
        // Prevent multiple clicks
        if (app.state.userAnswers[app.state.currentIndex] !== null) return;

        const q = app.state.questions[app.state.currentIndex];
        // q.answer is 1-based index (1,2,3,4,5)
        const correctIdx = q.answer - 1;
        
        app.state.userAnswers[app.state.currentIndex] = selectedIdx;
        const isCorrect = (selectedIdx === correctIdx);
        app.state.results[app.state.currentIndex] = isCorrect;

        app.showFeedback(selectedIdx);
        
        // If correct, maybe auto-advance? No, user wants to see explanation or confirmation.
        // Enable Next
        document.getElementById('btn-next').disabled = false;
    },

    showFeedback: (selectedIdx) => {
        const q = app.state.questions[app.state.currentIndex];
        const correctIdx = q.answer - 1;
        const isCorrect = (selectedIdx === correctIdx);

        // UI Updates
        // Disable clicks
        const choices = document.querySelectorAll('.choice-item');
        choices.forEach(c => c.style.pointerEvents = 'none');

        // Styles
        if (isCorrect) {
            document.getElementById(`choice-${selectedIdx}`).classList.add('correct');
        } else {
            document.getElementById(`choice-${selectedIdx}`).classList.add('wrong'); // User selected (Bold)
            document.getElementById(`choice-${correctIdx}`).classList.add('choice-item', 'correct'); // Actual answer (Green/Red requirement handled by CSS classes)
             // Wait, requirement: "맞으면 문장을 초록으로 highlight하고 틀리면 선택한 정답은 bold로 실제 정답은 빨강으로 highlight"
             // My CSS:
             // .correct -> Green bg, green text.
             // .wrong -> Red bg, bold red text.
             // So if Wrong:
             // User Selection -> .wrong (Bold, Red BG) -> Matches "선택한 정답은 bold" (and highlighting usually implies BG).
             // Actual Answer -> "실제 정답은 빨강으로 highlight". I'll add a class .answer-highlight that does red highlight?
             // Usually "actual answer" is shown in Green to distinguish from the "wrong" selection.
             // But user explicitly said "실제 정답은 빨강으로 highlight". 
             // Okay, I will follow instructions strictly. 
             // Logic update: 
             // Correct: Selected gets Green.
             // Wrong: Selected gets Bold (maybe neutral or red?). Actual Answer gets Red Highlight.
             
             // Let's adjust styles via JS classes:
             document.getElementById(`choice-${selectedIdx}`).classList.add('selected-wrong'); // Bold
             document.getElementById(`choice-${correctIdx}`).classList.add('actual-answer-red'); // Red Highlight
        }
        
        // Show Next button active
        document.getElementById('btn-next').disabled = false;
    },

    nextQuestion: () => {
        if (app.state.currentIndex < app.state.questions.length - 1) {
            app.state.currentIndex++;
            app.renderQuestion();
        } else {
            app.finishQuiz();
        }
    },

    prevQuestion: () => {
        if (app.state.currentIndex > 0) {
            app.state.currentIndex--;
            app.renderQuestion();
        }
    },

    finishQuiz: async () => {
        app.state.mode = 'result';
        const total = app.state.questions.length;
        const correctCount = app.state.results.filter(r => r).length;
        const score = Math.round((correctCount / total) * 100);
        
        // Save history
        const tx = app.db.transaction(['history', 'wrong_answers'], 'readwrite');
        
        // 1. History
        const historyStore = tx.objectStore('history');
        historyStore.add({
            id: Date.now(),
            date: new Date().toLocaleString(),
            score: score,
            mode: app.state.quizMode,
            details: app.state.results // optional
        });

        // 2. Wrong Answers
        const wrongStore = tx.objectStore('wrong_answers');
        app.state.results.forEach((isCorrect, idx) => {
            if (!isCorrect) {
                const q = app.state.questions[idx];
                wrongStore.put({
                    id: q.id, // e.g. "2024-1"
                    date: Date.now(),
                    year: q.id.split('-')[0],
                    number: q.number
                });
            }
        });

        // Render Result View
        app.showView('view-result');
        document.getElementById('result-score').textContent = score;
        document.getElementById('result-date').textContent = new Date().toLocaleString();

        const list = document.getElementById('result-list');
        app.state.results.forEach((isCorrect, idx) => {
            const div = document.createElement('div');
            div.className = `res-item ${isCorrect ? 'correct' : 'wrong'}`;
            div.textContent = idx + 1;
            list.appendChild(div);
        });
    },

    goHome: () => {
        app.renderHome();
    },
    
    quitQuiz: () => {
        if (confirm('퀴즈를 종료하시겠습니까? 기록이 저장되지 않습니다.')) {
            app.renderHome();
        }
    },

    renderStats: () => {
        app.state.mode = 'stats';
        app.showView('view-stats');
        
        // Update Tabs
        document.getElementById('nav-solve').classList.remove('active');
        document.getElementById('nav-stats').classList.add('active');

        const tx = app.db.transaction('history', 'readonly');
        const store = tx.objectStore('history');
        const index = store.index('date'); // Sort by date
        const request = index.getAll();

        request.onsuccess = () => {
            const data = request.result || [];
            
            // Group by date and calculate average
            const grouped = data.reduce((acc, item) => {
                const d = new Date(item.id);
                const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                if (!acc[dateKey]) {
                    acc[dateKey] = { totalScore: 0, count: 0, timestamp: item.id };
                }
                acc[dateKey].totalScore += item.score;
                acc[dateKey].count += 1;
                return acc;
            }, {});

            const averagedData = Object.entries(grouped).map(([date, val]) => ({
                date,
                score: Math.round(val.totalScore / val.count),
                count: val.count,
                timestamp: val.timestamp
            }));

            // sort by date asc
            averagedData.sort((a, b) => a.timestamp - b.timestamp);
            const recent = averagedData.slice(-20); // Last 20 days
            
            const chartContainer = document.getElementById('score-chart');
            chartContainer.innerHTML = '';
            recent.forEach(item => {
                const group = document.createElement('div');
                group.className = 'chart-bar-group';
                
                const bar = document.createElement('div');
                bar.className = 'chart-bar';
                bar.style.height = `${item.score}%`;
                bar.dataset.score = item.score;
                
                // Detailed tooltip
                const tooltipText = item.count > 1 
                    ? `평균 ${item.score}점 (${item.count}회 응시, ${item.date})`
                    : `${item.score}점 (${item.date})`;
                bar.title = tooltipText;
                
                // Color code score
                if (item.score >= 80) bar.style.background = '#10b981';
                else if (item.score >= 60) bar.style.background = '#f59e0b';
                else bar.style.background = '#ef4444';

                const label = document.createElement('div');
                label.className = 'chart-label';
                const dateObj = new Date(item.timestamp);
                label.textContent = `${dateObj.getMonth()+1}/${dateObj.getDate()}`;
                
                group.appendChild(bar);
                group.appendChild(label);
                chartContainer.appendChild(group);
            });

            // 2. Top 10 Rank
            const rankList = document.getElementById('rank-list');
            // Sort by score desc
            const sortedByScore = [...data].sort((a, b) => b.score - a.score);
            const top10 = sortedByScore.slice(0, 10);
            
            rankList.innerHTML = '';
            top10.forEach((item, idx) => {
                const li = document.createElement('li');
                li.className = 'rank-item';
                const d = new Date(item.id);
                const dateStr = `${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`;
                li.innerHTML = `
                    <span class="rank-rank">${idx + 1}</span>
                    <span class="rank-date">${dateStr}</span>
                    <span class="rank-score">${item.score}점</span>
                `;
                rankList.appendChild(li);
            });
        };
    }
};

// Start
window.addEventListener('DOMContentLoaded', () => {
    app.init();
});

// Update styles for specific feedback requirements
const styleSheet = document.createElement("style");
styleSheet.innerText = `
.selected-wrong {
    font-weight: bold;
    border: 2px solid #000;
}
.actual-answer-red {
    background-color: #fee2e2;
    border-color: #ef4444;
    color: #991b1b;
}
`;
document.head.appendChild(styleSheet);
