const questions = [
    { question: "What is 2 + 2?", answers: ["3", "4", "5", "6"], correct: 1 },
    { question: "What is the capital of France?", answers: ["Berlin", "Madrid", "Paris", "Rome"], correct: 2 },
    { question: "What is 10 / 2?", answers: ["3", "4", "5", "6"], correct: 2 },
    { question: "What color is the sky?", answers: ["Blue", "Red", "Green", "Yellow"], correct: 0 },
    { question: "What is 3 * 3?", answers: ["6", "9", "12", "15"], correct: 1 },
    { question: "What is 15 - 7?", answers: ["8", "9", "10", "11"], correct: 0 },
    { question: "What is the capital of Spain?", answers: ["Madrid", "Barcelona", "Lisbon", "Rome"], correct: 0 },
    { question: "What is 20 / 5?", answers: ["2", "3", "4", "5"], correct: 3 },
    { question: "What is 7 + 5?", answers: ["11", "12", "13", "14"], correct: 1 },
    { question: "What is the capital of Italy?", answers: ["Berlin", "Madrid", "Paris", "Rome"], correct: 3 }
];

let shuffledQuestions;
let userAnswers = [];

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function generateQuiz() {
    shuffledQuestions = shuffle(questions);
    const quizDiv = document.getElementById("quiz");
    quizDiv.innerHTML = "";

    shuffledQuestions.forEach((q, index) => {
        const answers = shuffle([...q.answers]);
        quizDiv.innerHTML += `
            <div class="question-block">
                <div class="question">${index + 1}. ${q.question}</div>
                <ul class="options">
                    ${answers
                        .map(
                            (answer, i) =>
                                `<li><input type="radio" name="q${index}" value="${q.answers.indexOf(answer)}"> ${answer}</li>`
                        )
                        .join("")}
                </ul>
            </div>
        `;
        userAnswers.push(null);
    });

    quizDiv.innerHTML += `<button onclick="submitQuiz()">Submit</button>`;
}

function submitQuiz() {
    const quizDiv = document.getElementById("quiz");
    const inputs = quizDiv.querySelectorAll("input[type=radio]:checked");

    inputs.forEach(input => {
        const qIndex = parseInt(input.name.replace("q", ""));
        userAnswers[qIndex] = parseInt(input.value);
    });

    let score = 0;
    let resultHTML = "";

    shuffledQuestions.forEach((q, index) => {
        const isCorrect = userAnswers[index] === q.correct;
        if (isCorrect) score += 10;
        resultHTML += `<p>${index + 1}. ${q.question} - <span class="${isCorrect ? "correct" : "incorrect"}">${isCorrect ? "Correct" : "Incorrect"}</span></p>`;
    });

    quizDiv.style.display = "none";
    const resultDiv = document.querySelector(".result");
    resultDiv.style.display = "block";
    document.getElementById("score").innerHTML = `You scored ${score} points.`;
    resultDiv.innerHTML += resultHTML;
}
function goToHome() {
    // Arahkan ke halaman utama
    window.location.href = "weblogin2.html"; // Ganti "index.html" dengan nama halaman utama Anda
}

generateQuiz();