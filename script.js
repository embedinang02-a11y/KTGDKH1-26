let originalData = [];
let quizData = [];
let userAnswers = [];
let wrongQuestions = [];

let timeLeft = 0;
let timerInterval;
let isTimedMode = false;

// ================= EVENT =================
document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('sectionSelect').addEventListener('change', applyFilterAndRender);
document.getElementById('shuffleToggle').addEventListener('change', applyFilterAndRender);

// ================= LOAD FILE =================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    const selectedTime = document.getElementById('timeSelect').value;
    timeLeft = parseInt(selectedTime);

    clearInterval(timerInterval);

    isTimedMode = timeLeft > 0;

    if (!isTimedMode) {
        document.getElementById('timerDisplay').innerText = "♾️ Không giới hạn thời gian";
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];

        let rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // lọc dữ liệu hợp lệ
        originalData = rawData.filter((row, index) => {
            if (index === 0) return false;
            return row[0] && row[5];
        });

        applyFilterAndRender();
        startTimer();
    };

    reader.readAsArrayBuffer(file);
}

// ================= LỌC + TRỘN =================
function applyFilterAndRender() {
    const section = document.getElementById('sectionSelect').value;
    const shuffle = document.getElementById('shuffleToggle').checked;

    let data = originalData;

    // lọc CM / KTC (cột H = index 7)
    if (section !== "ALL") {
        data = data.filter(row => row[7] === section);
    }

    // trộn câu
    if (shuffle) {
        data = shuffleArray([...data]);
    }

    quizData = data;
    userAnswers = [];
    wrongQuestions = [];

    displayQuiz();
}

// ================= TRỘN =================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ================= HIỂN THỊ =================
function displayQuiz() {
    const quizContainer = document.getElementById('quizContainer');
    quizContainer.innerHTML = '';

    quizData.forEach((row, index) => {
        const div = document.createElement('div');
        div.className = 'question';
        div.id = `questionBox${index}`;

        div.innerHTML = `
            <h3>${index + 1}. ${row[0]}</h3>

            <button class="btn btn-sm btn-info mt-2"
                onclick="showAnswer(${index})">
                👀 Xem đáp án
            </button>

            <div id="answerResult${index}"></div>
        `;

        ['A','B','C','D'].forEach((opt, i) => {
            if (!row[i+1]) return;

            const ans = document.createElement('div');
            ans.className = 'answer';

            ans.innerHTML = `
                <input type="radio" name="question${index}" value="${opt}" id="q${index}${opt}">
                <label for="q${index}${opt}">${row[i+1]}</label>
            `;

            ans.querySelector('input').addEventListener('change', () => {
                checkAnswer(index, row[5]);
                updatePalette();
            });

            div.appendChild(ans);
        });

        quizContainer.appendChild(div);
    });

    createPalette();
}

// ================= XEM ĐÁP ÁN (ĐÃ FIX) =================
function showAnswer(index) {
    const row = quizData[index];
    const correctAnswer = row[5];
    const explanation = row[6] || "";

    const div = document.getElementById(`answerResult${index}`);

    div.innerHTML = `
        👉 Đáp án đúng: <b>${correctAnswer}</b>
        ${explanation ? `<div style="color:red; font-size:12px;">📌 ${explanation}</div>` : ""}
    `;
}

// ================= CHECK =================
function checkAnswer(index, correctAnswer) {
    const selected = document.querySelector(`input[name="question${index}"]:checked`);
    if (!selected) return;

    const value = selected.value;
    userAnswers[index] = value;

    const answers = document.querySelectorAll(`input[name="question${index}"]`);

    answers.forEach(a => {
        const label = document.querySelector(`label[for="${a.id}"]`);

        if (a.value === correctAnswer) {
            label.classList.add('correct');
        } else {
            label.classList.remove('correct');

            if (a.value === value) {
                label.classList.add('incorrect');
            } else {
                label.classList.remove('incorrect');
            }
        }
    });

    if (value !== correctAnswer && !wrongQuestions.includes(index)) {
        wrongQuestions.push(index);
    }
}

// ================= SEARCH =================
function searchQuestion() {
    const keyword = document.getElementById('searchInput').value.toLowerCase();

    quizData.forEach((row, index) => {
        const box = document.getElementById(`questionBox${index}`);
        box.style.display = row[0].toLowerCase().includes(keyword) ? '' : 'none';
    });
}

// ================= PALETTE =================
function createPalette() {
    const palette = document.getElementById('questionPalette');
    palette.innerHTML = '';

    quizData.forEach((_, i) => {
        const btn = document.createElement('div');
        btn.className = 'palette-item';
        btn.innerText = i + 1;

        btn.onclick = () => {
            document.getElementById(`questionBox${i}`).scrollIntoView({ behavior: 'smooth' });
        };

        palette.appendChild(btn);
    });
}

function updatePalette() {
    const items = document.querySelectorAll('.palette-item');

    items.forEach((item, i) => {
        item.classList.toggle('answered', !!userAnswers[i]);
    });
}

// ================= SUBMIT =================
function submitQuiz() {
    let score = 0;

    quizData.forEach((row, i) => {
        if (userAnswers[i] === row[5]) score++;
    });

    let total = quizData.length;

    document.getElementById('result').innerHTML =
        `Kết quả: ${score}/${total} - Điểm: ${(score/total*10).toFixed(2)}`;
}

// ================= REVIEW =================
function reviewWrong() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    wrongQuestions.forEach(i => {
        const row = quizData[i];

        const div = document.createElement('div');
        div.className = 'question';

        div.innerHTML = `
            <h3>${i + 1}. ${row[0]}</h3>
            ❌ Sai | 👉 Đáp án: <b>${row[5]}</b>
            ${row[6] ? `<div style="color:red">${row[6]}</div>` : ""}
        `;

        container.appendChild(div);
    });
}

// ================= TIMER =================
function startTimer() {
    if (!isTimedMode) return;

    timerInterval = setInterval(() => {
        timeLeft--;

        let m = Math.floor(timeLeft / 60);
        let s = timeLeft % 60;

        document.getElementById('timerDisplay').innerText =
            `⏱️ ${m}:${s < 10 ? '0' : ''}${s}`;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Hết thời gian!");
            submitQuiz();
        }
    }, 1000);
}
function generateExam() {

    if (!originalData || originalData.length === 0) {
        alert("⚠️ Vui lòng tải file Excel trước!");
        return;
    }

    // cấu trúc đề
    const structure = {
        "CMNV": 75,
        "KTC-MH": 3,
        "KTC-SPDV": 4,
        "KTC-NQ": 3,
        "KTC-PL": 4,
        "KTC-CSKH": 5,
        "KTC-TCPC": 3,
        "KTC-CĐS": 3
    };

    let exam = [];

    for (let key in structure) {
        let pool = originalData.filter(row => row[8] === key);

        if (pool.length < structure[key]) {
            alert(`❌ Không đủ câu cho phần ${key}`);
            return;
        }

        let selected = shuffleArray([...pool]).slice(0, structure[key]);

        exam = exam.concat(selected);
    }

    // trộn toàn bộ đề
    exam = shuffleArray(exam);

    quizData = exam;
    userAnswers = [];
    wrongQuestions = [];

    // set thời gian 45 phút
    clearInterval(timerInterval);
    timeLeft = 2700;
    isTimedMode = true;
    startTimer();

    displayQuiz();

    alert("✅ Đã tạo đề 100 câu chuẩn!");
}