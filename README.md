# EvalAI 🧠✍️

**EvalAI** is a smart exam paper evaluator built using React, Node.js, and AI technologies.  
It automates the process of answer evaluation by extracting text from scanned answer sheets and comparing it with model answers using AI.

---

## 🚀 Features

- 🖼️ **Text Extraction** from handwritten or scanned answer sheets using **Tesseract.js**
- 🧠 **Answer Evaluation** using **Gemmini API** for AI-driven comparison
- 📊 **Score Calculation** and instant feedback
- 💻 Built with a modern **React frontend**
- ⚙️ Backend integration using Node.js & Express

---

## 🧰 Tech Stack

| Layer       | Technology           |
|-------------|----------------------|
| Frontend    | React, Tailwind CSS  |
| Text OCR    | Tesseract.js         |
| AI Engine   | Gemmini API          |
| Backend     | Node.js, Express.js  |
| Database    | MongoDB              |
| Dev Tools   | Git, VS Code, GitHub |

---

## 🧪 How It Works

1. **Upload Answer Sheet**  
   Users upload a scanned image or PDF of the handwritten answer.

2. **Extract Text with Tesseract.js**  
   The system extracts text from the image using OCR.

3. **Evaluate with Gemmini API**  
   The extracted answer is compared with the model answer using an AI scoring system via Gemmini.

4. **Display Score**  
   The app shows the evaluation score and feedback instantly.

---

## 🛠 Installation

```bash
# Clone the repository
git clone https://github.com/Lakaystar123/EvalAI.git
cd EvalAI

# Install frontend dependencies
npm install

# Move to backend folder and install server dependencies
cd Backend
npm install

# Run backend server
npm start
