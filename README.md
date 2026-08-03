# Scora

> **Build Your Lucky Future**

[![Status](https://img.shields.io/badge/Status-In%20Development-yellow)]()
[![Phase](https://img.shields.io/badge/Phase-2-blue)]()
[![Backend](https://img.shields.io/badge/Backend-In%20Development-orange)]()
[![Frontend](https://img.shields.io/badge/Frontend-In%20Development-orange)]()
[![Git](https://img.shields.io/badge/Git-Version%20Control-F05032?logo=git\&logoColor=white)]()
[![GitHub](https://img.shields.io/badge/GitHub-Team%20Repository-181717?logo=github\&logoColor=white)]()
[![License](https://img.shields.io/badge/License-TBD-lightgrey)]()

---

## About Scora

**Scora** is an AI-powered technical verification and freelance platform built specifically for software developers.

The platform helps developers prove their real technical skills through coding assessments, technical interviews, code evaluation, **Skill Points (SP)**, **Trust Score**, and a **Developer Passport**.

Scora is not against the use of AI.

Instead, Scora focuses on measuring whether developers understand, can explain, and can effectively work with the code they produce.

The platform aims to create a more reliable way for clients and companies to discover and evaluate software developers based on verified technical ability rather than claims alone.

---

# Problem

The rapid adoption of AI coding tools has changed how software is developed.

Developers can now generate large amounts of code quickly, but generating code does not necessarily mean understanding it.

At the same time, clients and companies often have difficulty determining whether a developer:

* Truly understands the technologies they claim to know.
* Can solve technical problems independently.
* Can maintain and improve existing code.
* Understands software engineering principles.
* Can explain the code they produce.

This creates uncertainty during freelance hiring and technical recruitment.

---

# Solution

Scora creates a technical reputation layer for developers.

Developers can demonstrate their capabilities through:

* Coding Assessments
* AI-Generated Challenges
* Live Coding
* Automated Code Evaluation
* Technical Interviews
* Trust Engine
* Skill Points (SP)
* Trust Score
* Verified Skills
* Developer Passport

Companies and clients can then use these signals to make more informed hiring decisions.

---

# Target Users

### Developers

Developers can:

* Build a technical profile.
* Take coding assessments.
* Earn Skill Points.
* Build a Trust Score.
* Verify technical skills.
* Create a Developer Passport.
* Showcase verified technical capabilities.

### Clients

Individual clients can:

* Discover developers.
* Search by technical skills.
* Review Developer Passports.
* Check Trust Scores.
* Check verified skills.
* Contact developers.

### Companies

Companies can:

* Discover technical talent.
* Search developers.
* Filter candidates.
* Review verified skills.
* Evaluate Trust Scores.
* Review Developer Passports.
* Build candidate shortlists.
* Use technical assessments.

---

# Tech Stack

> The stack below represents the current project architecture. Update versions/tools if the implementation changes.

## Frontend

![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5\&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3\&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript\&logoColor=black)
![React](https://img.shields.io/badge/React-20232A?logo=react\&logoColor=61DAFB)

* React
* JavaScript
* HTML5
* CSS3

## Backend

![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js\&logoColor=white)
![API](https://img.shields.io/badge/API-REST-005571)

* Node.js
* REST API
* Backend services
* Authentication
* Database layer

> Replace or extend this section with the exact backend framework and database currently used by the team.

## Development Tools

![Git](https://img.shields.io/badge/Git-F05032?logo=git\&logoColor=white)
![GitHub](https://img.shields.io/badge/GitHub-181717?logo=github\&logoColor=white)
![VS Code](https://img.shields.io/badge/VS%20Code-007ACC?logo=visualstudiocode\&logoColor=white)
![Figma](https://img.shields.io/badge/Figma-F24E1E?logo=figma\&logoColor=white)

* Git
* GitHub
* VS Code
* Figma

---

# Project Architecture

Scora follows a modular architecture separating the frontend, backend, shared resources, and documentation.

```text
Scora/
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── layouts/
│       ├── hooks/
│       ├── services/
│       ├── assets/
│       └── utils/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   │
│   ├── tests/
│   └── package.json
│
├── docs/
│
├── .env.example
├── .gitignore
├── README.md
└── package.json
```

### Architecture Flow

```text
User
 │
 ▼
Frontend
 │
 ▼
API Layer
 │
 ▼
Backend
 │
 ├── Authentication
 ├── User Management
 ├── Assessments
 ├── Code Evaluation
 ├── Trust Engine
 ├── Skill Points
 └── Developer Passport
 │
 ▼
Database
```

---

# Repository Structure

```text
Soon and sorry to late 
```

---

# ⚙️ Environment Setup

## 1. Clone the repository

```bash
git clone <REPOSITORY_URL>
cd Scora
```

## 2. Install dependencies

### Frontend

```bash
cd frontend
npm install
```

### Backend

```bash
cd ../backend
npm install
```

---

## 3. Environment Variables

Create a `.env` file based on `.env.example`.

Example:

```env
PORT=5000

DATABASE_URL=your_database_url

JWT_SECRET=your_secret_key

API_URL=http://localhost:5000

FRONTEND_URL=http://localhost:3000
```

### Important

Never commit the real `.env` file to GitHub.

Use:

```text
.env
```

inside `.gitignore`.

Commit:

```text
.env.example
```

instead.

---

# Running the Project

## Start Backend

```bash
cd backend
npm run dev
```

Backend will run on:

```text
http://localhost:5000
```

## Start Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

Frontend will run on the URL provided by the development server.

---

# Product Design

## Figma

 **UI Design:**
`[ADD FIGMA LINK]`

## User Flow

 **User Flow Diagram:**
`[ADD USER FLOW LINK]`

## Design System

 **Design System / UI Kit:**
`[ADD DESIGN SYSTEM LINK]`

---

# Core Product Features

## Developer

* Authentication
* Developer Profile
* Developer Dashboard
* Coding Assessments
* AI-Generated Challenges
* Live Code Editor
* Code Execution
* Automated Evaluation
* Skill Points
* Trust Score
* Trust Engine
* Verified Skills
* Developer Passport

## Client

* Developer Search
* Skill Filtering
* Trust Score
* Skill Verification
* Developer Passport
* Developer Contact

## Company

* Company Dashboard
* Developer Search
* Candidate Filtering
* Developer Passport
* Trust Score
* Verified Skills
* Candidate Shortlisting
* Technical Assessments

---

# Trust Engine

The **Trust Engine** is one of Scora's core product concepts.

It is designed to evaluate signals related to assessment integrity and developer behavior.

Potential signals include:

* Code evolution
* Submission behavior
* Copy/paste activity
* Suspicious activity
* Assessment timing
* Code changes
* Interaction patterns

The Trust Engine should not treat any single signal as definitive proof of AI usage or cheating.

Instead, multiple signals should contribute to an overall assessment integrity model.

---

# Skill Points & Trust Score

## Skill Points — SP

Skill Points represent a developer's demonstrated technical capabilities across assessments and verified skills.

Example:

```text
JavaScript      850 SP
React           720 SP
Node.js         640 SP
Python          530 SP
```

## Trust Score

The Trust Score represents the platform's confidence in the reliability and integrity of a developer's verified assessment results.

```text
Trust Score
     92
   / 100
```

---

# Developer Passport

The Developer Passport is Scora's technical reputation profile.

It can contain:

* Developer identity
* Technical skills
* Skill Points
* Trust Score
* Verified skills
* Assessment results
* Achievements
* Verification status
* Public profile

The long-term goal is to make the Developer Passport portable and verifiable.

---

# Current Development Status

## Phase 2 — Product Experience & Team Execution

**Current Status: 🟡 In Development**

### ✅ Completed / In Progress

* [x] Product concept
* [x] Problem validation
* [x] Business research
* [x] Feature planning
* [x] MVP planning
* [x] User flow planning
* [x] UI/UX design
* [x] Design System planning
* [x] GitHub repository setup
* [x] Project structure
* [ ] Backend implementation
* [ ] Database implementation
* [ ] API implementation
* [ ] Authentication implementation
* [ ] Assessment engine
* [ ] Trust Engine implementation
* [ ] Frontend integration
* [ ] Testing
* [ ] Deployment

###  Current Focus

> **The team is currently working on the backend implementation and preparing the core system architecture, API structure, database layer, authentication, and foundational services required for the MVP.**

---

# 🌳 Development Workflow

The team follows a Git-based collaborative workflow.

```text
main
 │
 ├── feature/authentication
 ├── feature/developer-profile
 ├── feature/assessment
 ├── feature/trust-engine
 ├── feature/backend-api
 └── feature/frontend
```

Recommended workflow:

```text
Create Branch
     ↓
Develop Feature
     ↓
Commit Changes
     ↓
Push Branch
     ↓
Pull Request
     ↓
Code Review
     ↓
Tests
     ↓
Merge
```

---

# 📝 Commit Convention

We use descriptive commit messages.

Examples:

```text
feat: add developer authentication

feat: add assessment API

fix: resolve authentication validation issue

docs: update README

refactor: improve assessment service

test: add assessment API tests

chore: update dependencies
```

---

# 🔄 Project Status

| Area                | Status         |
| ------------------- | -------------- |
| Product Research    | ✅ Completed    |
| Business Planning   | ✅ Completed    |
| Feature Planning    | ✅ Completed    |
| MVP Definition      | 🟡 In Progress |
| User Flow           | 🟡 In Progress |
| UI/UX               | 🟡 In Progress |
| Design System       | 🟡 In Progress |
| GitHub Setup        | ✅ Completed    |
| Frontend Structure  | 🟡 In Progress |
| Backend Structure   | 🟡 In Progress |
| Backend Development | 🔨 In Progress |
| Database            | 🔨 In Progress |
| API                 | 🔨 In Progress |
| Authentication      | ⏳ Planned      |
| Trust Engine        | ⏳ Planned      |
| Testing             | ⏳ Planned      |
| Deployment          | ⏳ Planned      |

---

# 🗺️ Roadmap

### Phase 1 — Validation

* Problem Validation
* Market Research
* Business Model
* Product Validation

### Phase 2 — Product Experience

* Feature List
* MVP Scope
* User Flows
* UI/UX
* Design System
* GitHub Workflow
* Project Architecture
* Initial Implementation

### Phase 3 — MVP Development

* Backend
* Database
* Authentication
* Assessments
* Code Evaluation
* Trust Engine
* Skill Points
* Trust Score
* Developer Passport

### Phase 4 — Validation & Launch

* Testing
* Security
* User Testing
* Beta Launch
* Developer Onboarding
* Company Onboarding
* Product Analytics

---

# 📚 Documentation

Project documentation is organized into:

```text
Documentation/
│
├── Research/
│
├── Business/
│
├── Technical/
│
└── Phase 2 Deliverables/
    │
    ├── 01 - Feature List & MVP Scope
    ├── 02 - User Flows
    ├── 03 - UI Design
    ├── 04 - Design System
    ├── 05 - GitHub Setup
    └── 06 - Implementation Structure
```

---

# 👨‍💻 Team

## Code Luck

Building **Scora** with the goal of creating a more trustworthy technical reputation system for software developers.

> **Build Your Lucky Future 🚀**

---

# 📄 License

License: **TBD**

---

# ⚠️ Development Notice

Scora is currently under active development.

Features, architecture, APIs, database structures, and technologies may change as the product evolves and technical decisions are validated.
