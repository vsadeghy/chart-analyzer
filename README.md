# Chart Analyzer - Analyze your crypto trading strategy with real-time charts

**A modular, real-time trading platform with multi-exchange support, technical indicator analysis, and interactive visualization.**
Designed for scalability, this project demonstrates a clean architecture with a focus on maintainability and extensibility.

## ✨ Key Features

- **Multi-Exchange Integration**

  - Different exchange implementations via dependency injection pattern
  - Extensible adapter system for new exchanges (Nobitex ready for integration)
  - Unified trading API interface

- **Technical Analysis Engine**

  - Real-time calculation of:
    **MACD** | **Stochastic Oscillator** | **Ichimoku Cloud**
  - Cron-based data pipeline based on the chart period
  - Strategy decision module with buy/sell signals

- **Advanced Visualization**

  - SciChart-powered indicator overlays

- **Architecture**
  - **Backend**: Node.js + TypeScript with Hono framework
  - **Frontend**: React/Next.js with Tailwind CSS

## 🛠️ Technologies

**Frontend**

- React
- Next.js
- Tailwind CSS
- SciChart

**Backend**

- Node.js
- TypeScript
- Hono

## 🚀 Installation

```sh
git clone https://github.com/vsadeghy/chart-analyzer.git
cd chart-analyzer
pnpm install
```

## 🔑 Environment Variables

```sh
cp server/.env.example server/.env
cp web/.env.example web/.env
```

## 🚀 Running the project

```sh
pnpm -r run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📂 Project Structure

```text
.
├── backend
│ └── src
│   ├── bot
│   │ ├── exchanges # Exchange adapters
│   │ ├── chartOption.ts # Default options for getting and running the chart (symbol, period, etc.)
│   │ ├── indicators.ts # Calculation of technical indicators
│   │ └── strategy.ts # Where magic happens (rememver to implement your own strategy)
│   └── env.ts # Backend nvironment variables
└── frontend
  └── src
    ├── app
    │ ├── chart # Chart components
    │ │ ├── fetchChart.ts # Fetches the chart data from the backend
    │ │ ├── drawChart.ts # Draws the chart and indicators
    │ │ └── page.tsx # Define different panes for the chart and indicators
    │ └── page.tsx # Landing page (currently empty)
    └── env.ts # Frontend Environment variables
```

## 🔮 Future Roadmap

- [ ] Trade history visualization
- [ ] Backtesting framework integration
- [ ] Database for storing trade history
- [ ] Mobile-responsive chart layouts
