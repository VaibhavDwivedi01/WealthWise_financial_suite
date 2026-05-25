# WealthWise | Premium Financial Analytics Suite

WealthWise is an ultra-premium, full-stack financial suite designed to provide precise loan amortization schedules, budget affordability heuristics, and term insurance calculations in real time. It is built as a zero-dependency, high-performance Java web server backend coupled with a gorgeous dark-theme glassmorphism frontend dashboard.

---

## 🎨 Design Aesthetics & Premium UX
* **Sleek Sidebar Branding**: A text-free glowing 3D logo emblem aligned perfectly next to native, high-legibility HTML typography headers (**"WealthWise / Financial Suite"**).
* **Budget Affordability Diagnostics**: Dynamic **Debt-to-Income (DTI)** ratio calculators and responsive, color-coded progress indicators (Green: Safe, Teal: Manageable, Orange: Warning, Red: Critical) that respond instantly to disposable income and EMI sliders.
* **Low-Latency Chatbot Advisor**: Floating frosted chat panel featuring **"Wealthy"**, your personal AI assistant. Employs a low-latency double-engine Google Gemini AI pipeline with dynamic typing dots animation.
* **Responsive Layouts**: Premium glassmorphic grid spacing designed to scale cleanly across mobile, tablet, and high-DPI desktop viewports.

---

## 🚀 Key Features
1. **Reducing Balance Loan EMI**: Dynamic interest rate modeling relative to FICO Credit Profile ratings, monthly and scheduled prepayment savings, and amortization calendar grids.
2. **Dynamic USD/INR Conversions**: Automatic conversions between Rupees (₹) and Dollars ($) at a standard rate of `1 USD = 80 INR`, dynamically converting all input values and scaling slider ranges.
3. **High-Fidelity Statements Export**: One-click **"Export CSV"** for spreadsheet records and branded, print-ready A4 reports compiled dynamically with **"Download PDF"**.
4. **Comprehensive Insurance calculators**: Instant premiums estimations for Term Life (based on risk factor models), Health Care (spouse/children/riders), and Auto (IDV, CC, NCB discounts) plans.
5. **Secure Admin Command Console**: Dynamic panel yielding statistics oversight, global saved inquiries, and cascaded account termination under secure SHA-256 database password hashing.

---

## 🛠️ Technology Stack
* **Backend**: Java 17, `com.sun.net.httpserver` HttpServer routing, Gson database adapters.
* **Frontend**: HTML5, Vanilla CSS3 (custom CSS variables), Vanilla JavaScript, Chart.js CDNs, `html2pdf.js` CDNs, FontAwesome vector libraries.
* **APIs**: Low-latency Double-Engine Google Gemini AI Studio beta models pipeline.

---

## 💻 Setup & Installation

### Prerequisites
* Java Development Kit (JDK) 17 or higher.
* Apache Maven 3.6 or higher.

### Running Locally
1. **Navigate to the Backend directory**:
   ```bash
   cd backend
   ```
2. **Compile and Build the Package**:
   ```powershell
   $env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'; mvn clean compile
   ```
3. **Start the Web Server**:
   ```powershell
   $env:JAVA_HOME = 'C:\Program Files\Java\jdk-17'; mvn exec:java
   ```
4. **Access the Suite**:
   Open your browser and navigate to **`http://localhost:3000`** to view the live dashboard!
