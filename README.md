AI Fact Checker
AI Fact Checker is a smart misinformation detection tool built with React, Vite, TypeScript, Tailwind, and shadcn-ui. It allows users to verify facts from text or PDF files and provides an AI-generated truth score indicating whether the news or claim is real, misleading, or fake.

🚀 Features
📄 Upload PDF or Enter Text
Users can upload a PDF document or manually type/paste any claim, article snippet, or news headline.
The system automatically extracts text from PDFs.
🤖 AI-Powered Fact Verification
Claims are analyzed using a fact-checking AI engine.

The app generates:

A Truth Score (0–100)
A Verdict (Real / Partially True / Fake / Unverified)
Supporting evidence and reasoning
🔐 User Accounts (Coming Soon)
Users will be able to:

Sign up / Login
Save their fact-check history
Bookmark important verifications
Sync data across devices
🎨 Modern UI/UX
Clean, responsive interface
Smooth animations and components using shadcn-ui
Dark mode friendly
📦 Tech Stack
React + TypeScript – Frontend framework
Vite – Fast development environment
Tailwind CSS – Styling
shadcn-ui – UI components
pdf.js – PDF text extraction
AI Backend – Fact-checking model / API
🧪 How It Works
User uploads a PDF or enters text.

Text is extracted (if PDF) and sent to the AI engine.

AI compares the claim against real-time verified sources.

The system generates:

Truth Score
Explanation
Evidence summary
User can save or bookmark results (future feature).

🛠️ Running the Project Locally
# Clone the repository
git clone <https://github.com/Gaurav159p/Fact_check_SYS>

# Install dependencies
npm i

# Start the development server
npm run dev
🌐 Deployment
Deploy easily through Lovable.dev:

Open the project in Lovable
Click Share → Publish
You can also attach a custom domain via: Project → Settings → Domains → Connect Domain
📌 Roadmap
 User Accounts (email / Google)
 Saved History & Bookmarks
 Truth Score Heatmaps
 Multi-language support
 Deepfake image/video detection
📫 Feedback
If you have new ideas or feature requests, feel free to share them!
