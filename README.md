# 📸 Instagram Clone (Full-Stack)

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://www.python.org/)
[![PyTorch](https://img.shields.io/badge/PyTorch-Deep%20Learning-red?logo=pytorch)](https://pytorch.org/)
[![Hugging Face](https://img.shields.io/badge/Hugging%20Face-Transformers-yellow?logo=huggingface)](https://huggingface.co/)
[![Streamlit](https://img.shields.io/badge/Streamlit-Web%20App-FF4B4B?logo=streamlit)](https://streamlit.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A **production-ready NLP web application** for detecting and explaining hate speech using a fine-tuned Transformer model. This project demonstrates an **end-to-end ML pipeline** — from dataset handling and model training to cloud model hosting (Hugging Face) and live deployment (Streamlit).

A **full-stack Instagram clone** built with **React (Vite), Node.js + Express, MySQL**, and **Socket.IO**, featuring real-time likes, comments, follows, chat, and voice/video call signaling.

This project demonstrates how a **real production social media app** is built, deployed, and scaled using modern tools.

🚀 **Live Demo**

* **Frontend (Vercel)**
👉 [https://instagram-frontend-kohl.vercel.app](https://instagram-frontend-kohl.vercel.app/)

* **Backend API (Render)**
👉 [https://instagram-9au5.onrender.com](https://instagram-9au5.onrender.com/)

---

## 🎥 Project Demo

![Project Demo](assets/demo.gif)

---

## 📸 Screenshots

### 🏠 Interface & Input (Home Page & Text Suggestions)

| Home Page | Text Suggestions |
|-----------|------------------|
| ![](assets/home.jpg) | ![](assets/suggestions.jpg) |

---

### 📊 Prediction Results

| Result 1 | Result 2 | Result 3 |
|----------|----------|----------|
| ![](assets/prediction_1.jpg) | ![](assets/prediction_2.jpg) | ![](assets/prediction_3.jpg) |

---

## 🧠 Architecture Overview
```
Frontend (React + Vite)  ───▶  Backend (Node.js + Express)
                                │
                                ├── MySQL (Railway)
                                ├── Cloudinary (Images & Videos)
                                ├── Socket.IO (Real-time features)
                                └── JWT Authentication
```
        

---

## ❓ Problem Statement

The rapid growth of user-generated content on social media and online platforms has led to a significant increase in **toxic, abusive, and hate-based language**. Manually moderating such content is **time-consuming, expensive, and not scalable**, especially at the scale of millions of daily posts.

Traditional rule-based systems fail to capture contextual and semantic nuances of language, leading to high false positives and negatives. As a result, there is a strong need for **machine learning–based solutions** that can automatically detect hate speech with high accuracy while being deployable in real-world systems.

This project aims to address these challenges by leveraging **Transformer-based NLP models** to perform reliable hate speech detection and demonstrate how such models can be trained, hosted, and deployed in production environments.

---

## ✨ Features

### 🔐 Authentication

* JWT-based authentication

* Secure HTTP-only cookies

* Login & signup system

### 🧑‍🤝‍🧑 Social Features

* Follow / Unfollow users

* Friend system

* User profiles

### 🖼️ Posts

* Create posts with images/videos

* Like & unlike posts (real-time)

* Comment on posts (real-time)

* View counts & hashtags

### 💬 Real-Time (Socket.IO)

* Live likes & unlikes

* Live comments

* Follow updates

* Chat system

* Voice / video call signaling (WebRTC-ready)

### ☁️ Media Uploads

* Cloudinary integration

* Optimized image & video storage

---

## 🏗️ Architecture

```
User Input (Streamlit UI)
        ↓
Tokenizer (Hugging Face)
        ↓
Fine-tuned Transformer Model
        ↓
Softmax Probabilities
        ↓
Prediction + Confidence Visualization
```

---

## 📈 Model Performance

The model was trained for 3 epochs and evaluated on a held-out validation set. The best-performing model was selected based on validation F1-score.

**Best Validation Metrics:**
- **Accuracy:** 69.21%
- **F1-score:** 69.40%

**Training Summary:**
- Epoch 1 — Val Acc: 69.21%, Val F1: 69.40% ✅ (Best model saved)
- Epoch 2 — Val Acc: 67.76%, Val F1: 67.96%
- Epoch 3 — Val Acc: 67.81%, Val F1: 67.97%

> Note: While training loss continued to decrease across epochs, validation performance peaked early, indicating the onset of overfitting. The final deployed model corresponds to the best validation checkpoint.

---

## 🤗 Model Hosting (Hugging Face)

Due to GitHub’s file size limitations, the trained model is hosted on **Hugging Face Hub** and dynamically loaded during app startup.

* Model Repository: `humasfurquan/hatexplain-bert`
* Framework: PyTorch + Transformers

This approach ensures:

* Faster repository cloning
* Clean version control
* Industry-standard model sharing

---

## 🧪 Training Journey & Optimization

This project went through multiple iterations:

- **First attempt:** Model training was performed on CPU, taking approximately **7 hours**, highlighting the limitations of local CPU-based training for large Transformer models.
- **Second attempt:** Training was interrupted due to session termination, resulting in loss of in-memory variables and requiring a full restart.
- **Final iteration:** The model was successfully trained using **GPU acceleration**, reducing training time to **~26 minutes** and significantly improving development efficiency.

These iterations reflect real-world ML challenges such as resource constraints, session management, and the importance of hardware acceleration.

---

## 🚧 Engineering Challenges Solved

During the development and deployment of this project, several real-world engineering challenges were identified and resolved:

- **GitHub file size limitations:** The trained Transformer model exceeded GitHub’s file size limits, making direct storage in the repository impractical.
- **Model storage solution:** The model was hosted on **Hugging Face Hub**, enabling versioned, scalable, and industry-standard model distribution.
- **Dynamic model loading in Streamlit:** Implemented runtime model loading with proper handling of CPU/GPU availability to ensure smooth deployment.
- **Cache handling:** Configured Hugging Face cache management to avoid repeated downloads and ensure consistent behavior across local and cloud environments.

These solutions demonstrate practical considerations required when transitioning from experimentation to production-ready machine learning applications.

---

## 🛠️ Tech Stack

## Frontend

* React (Vite)

* React Router

* Axios

* Socket.IO Client

* CSS / Custom UI

## Backend

* Node.js

* Express.js

* MySQL (mysql2)

* Socket.IO

* JWT Authentication

* Multer
 
* Cloudinary SDK

## Database & Services

* MySQL – Railway

* Media Storage – Cloudinary

* Backend Hosting – Render
 
* Frontend Hosting – Vercel

---

## ✨ Features

### 🔐 Authentication

* JWT-based authentication

* Secure HTTP-only cookies

* Login & signup system

### 🧑‍🤝‍🧑 Social Features

* Follow / Unfollow users

* Friend system

* User profiles

### 🖼️ Posts

* Create posts with images/videos

* Like & unlike posts (real-time)

* Comment on posts (real-time)

* View counts & hashtags

### 💬 Real-Time (Socket.IO)

* Live likes & unlikes

* Live comments

* Follow updates

* Chat system

* Voice / video call signaling (WebRTC-ready)

### ☁️ Media Uploads

* Cloudinary integration

* Optimized image & video storage

---

## 📁 Project Structure

```
Instagram/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   ├── index.js
│   └── init.sql
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   └── vite.config.js
│
└── README.md

```

---

## 🔧 Environment Variables

### Backend (backend/.env)

```
PORT=5000

DB_HOST=your_railway_host
DB_PORT=12345
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=your_db_name

JWT_SECRET=your_secret_key

CLOUDINARY_CLOUD_NAME=xxxx
CLOUDINARY_API_KEY=xxxx
CLOUDINARY_API_SECRET=xxxx

CLIENT_URL=https://instagram-frontend-kohl.vercel.app
```

### Frontend (Vercel Environment Variables)

```
VITE_API_BASE=https://instagram-9au5.onrender.com
VITE_SOCKET_URL=https://instagram-9au5.onrender.com
```

---

## 🗄️ Database

* MySQL hosted on Railway

* Schema initialized via init.sql

* Tables include:

   * users

posts

comments

likes

follows

messages

calls

hashtags

events

friend_requests

---

## 📦 Installation (Local Setup)

```bash
# Clone repository
git clone https://github.com/HumasFurquan/Hate-Speech-Detection-2.0.git
cd Hate-Speech-Detection-2.0

# Create virtual environment (optional)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run app.py
```

---

## 📊 How It Works

1. User enters text in the Streamlit UI
2. Text is tokenized using the same tokenizer used during training
3. The Transformer model predicts class probabilities
4. The most probable label is returned
5. Confidence scores are visualized

---

## 📁 Project Structure

```
Instagram/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── config/
│   ├── index.js
│   └── init.sql
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── services/
│   ├── public/
│   └── vite.config.js
│
└── README.md

```

---

## 🎯 Use Cases

* Social media moderation
* Toxic content filtering
* Research on online hate speech
* NLP model deployment demonstration

---

## 🔒 Limitations

* Model performance depends on dataset bias
* English-language focused
* Not a replacement for human moderation

These limitations are common in supervised NLP systems and can be mitigated through dataset expansion, multilingual training, and continual learning with real-world feedback.

---

## 📈 Future Improvements

* Multi-class hate category breakdown
* SHAP / attention-based explainability UI
* Multi-language support
* REST API (FastAPI backend)
* User feedback loop for model retraining
* Database-backed history instead of session state

---

## 👨‍💻 Author

**Humas Furquan**
ML & Frontend Developer
GitHub: [https://github.com/HumasFurquan](https://github.com/HumasFurquan)

---

## ⭐ Acknowledgements

* Hugging Face 🤗
* Streamlit
* Open-source NLP community

---

> If you find this project useful, consider giving it a ⭐ on GitHub.
