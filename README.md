# Singapore Government [Expenditure](https://xuanx1.github.io/gahmenMOnies/)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen)](https://xuanx1.github.io/gahmenMOnies/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![D3.js](https://img.shields.io/badge/Built%20with-D3.js-orange)](https://d3js.org/)

An interactive, animated Sankey diagram visualizing Singapore's government operating expenditure flows across sectors and departments from 1997 to 2025. This project provides insights into how government spending has evolved over nearly three decades, with a focus on major policy shifts and emerging priorities.

<img width="1905" height="918" alt="Screenshot 2026-05-24 094547" src="https://github.com/user-attachments/assets/8fc1f1b0-f00e-4bcd-aef7-ea227adadf0e" />

## ✨ Features

- 🌊 **Animated Flow Visualization**: Watch government spending patterns evolve over nearly 3 decades
- 📊 **Interactive Timeline**: Click specific years or play automated animations through time
- 🎨 **Modern Design**: Beautiful gradient styling with smooth CSS transitions
- 📱 **Responsive Layout**: Optimized for desktop, tablet, and mobile viewing
- 💫 **Rich Tooltips**: Detailed hover information showing expenditure amounts and percentages
- ⚡ **Performance Optimized**: Smooth animations with efficient D3.js rendering
- 🎬 **Variable Speed Control**: Adjust animation speed (0.5x, 1x, 2x) for different viewing preferences

## 📁 Project Structure

```
gahmenMOnies/
├── index.html                     # Main webpage with embedded styles and layout
├── government_sankey.js          # Core D3.js logic for Sankey diagram
├── government_expenditure.json   # Primary data source (1997-2025)
├── government_expenditure.csv    # Alternative CSV format
├── GovernmentFiscalPosition.csv  # Additional fiscal data
├── M130581-table...csv          # Sector breakdown data
├── OfficialForeignReservesEndOfPeriodMonthly.csv # Reserve data
└── README.md                     # Project documentation
```

## 🚀 Quick Start

### Option 1: View Online
Simply visit the [live demo](https://xuanx1.github.io/gahmenMOnies/) to explore the visualization immediately.

### Option 2: Run Locally
1. **Clone the repository**:
   ```bash
   git clone https://github.com/xuanx1/gahmenMOnies.git
   cd gahmenMOnies
   ```

2. **Serve the files** (required due to CORS restrictions):
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using PHP
   php -S localhost:8000
   ```

3. **Open in browser**: Navigate to `http://localhost:8000`

## 🎮 How to Use

| Action | Description |
|--------|-------------|
| **Year Selection** | Click any year button (1997, 2000, 2005, 2010, 2015, 2020, 2025) to view expenditure for that specific year |
| **Play Animation** | Click "▶ Play Animation" to automatically cycle through all years and see spending evolution |
| **Speed Control** | Click "Speed" to toggle between 1x, 2x, and 0.5x animation speeds |
| **Hover Details** | Hover over nodes and connecting flows to see detailed expenditure amounts and descriptions |
| **Responsive Viewing** | The visualization automatically adapts to your screen size |

## 📊 Data Structure & Visualization

The Sankey diagram illustrates expenditure flows in an intuitive left-to-right format:

- **Left Side (Source)**: Four main government sectors
  - 🏥 **Social Development** - Healthcare, education, community services
  - 🛡️ **Security & External Relations** - Defense, foreign affairs, internal security
  - 📈 **Economic Development** - Trade, industry, infrastructure, technology
  - 🏛️ **Government Administration** - Central administration, public services

- **Right Side (Target)**: Individual ministries and departments
- **Connecting Flows**: Proportional width representing expenditure amounts
- **Color Coding**: Consistent colors help track sector relationships across years

## 📈 Key Insights & Trends

### Major Spending Categories
- **Social Development** consistently represents the largest expenditure category (40-50% of total)
- **Health expenditure** shows dramatic growth, especially post-2015 (aging population, COVID-19 response)
- **Defense spending** remains substantial and stable throughout all years
- **Education** maintains steady growth with periodic policy-driven increases

### Emerging Trends
- **Digital Development** emerges as a significant category in recent years (Smart Nation initiatives)
- **Infrastructure spending** peaks during major development phases
- **Social safety nets** expand significantly post-2008 financial crisis
- **Total expenditure** grows from **$14B SGD** (1997) → **$97B SGD** (2025)

### Policy Reflections
- **2003-2008**: Focus on economic restructuring and competitiveness
- **2009-2015**: Counter-cyclical spending and social support expansion
- **2016-2020**: Smart Nation and aging population preparations
- **2021-2025**: COVID-19 response and recovery measures

## 🛠️ Technical Implementation

### Core Technologies
- **[D3.js v7](https://d3js.org/)** - Data visualization and DOM manipulation
- **[D3-Sankey](https://github.com/d3/d3-sankey)** - Specialized Sankey diagram layouts
- **Modern CSS3** - Gradient backgrounds, backdrop filters, smooth animations
- **Vanilla JavaScript (ES6+)** - No frameworks, minimal dependencies
- **Google Fonts (Inter)** - Clean, modern typography

### Architecture
- **Single-page application** with embedded styles for easy deployment
- **CDN-based dependencies** for reliability and performance
- **JSON data format** for efficient parsing and manipulation
- **Responsive CSS Grid/Flexbox** layouts
- **Staggered animation system** for smooth visual transitions

### Performance Features
- **Efficient rendering** with D3's enter-update-exit pattern
- **Optimized animations** using requestAnimationFrame
- **Memory management** with proper event listener cleanup
- **Responsive design** with CSS media queries

## 🌐 Browser Compatibility

| Browser | Version | Status |
|---------|---------|---------|
| Chrome | 80+ | ✅ Fully Supported |
| Firefox | 75+ | ✅ Fully Supported |
| Safari | 13+ | ✅ Fully Supported |
| Edge | 80+ | ✅ Fully Supported |

### Requirements
- **JavaScript**: ES6+ support (arrow functions, const/let, template literals)
- **CSS**: Grid, Flexbox, backdrop-filter support
- **Network**: Internet connection for CDN resources and fonts

## 📂 Data Sources

### Primary Data
- **Source**: Accountant-General's Department, Ministry of Finance, Singapore
- **Period**: Financial Years 1997-2025 (29 years of data)
- **Currency**: Million Singapore Dollars (SGD)
- **Update Frequency**: Annual budget releases
- **Data Quality**: Official government financial statements

### Data Files
- `government_expenditure.json` - Main dataset with hierarchical structure
- `government_expenditure.csv` - Alternative CSV format for analysis
- `GovernmentFiscalPosition.csv` - Overall fiscal position data
- `M130581-table...csv` - Detailed sector breakdown
- `OfficialForeignReservesEndOfPeriodMonthly.csv` - Reserve position data

### Data Processing
- Values normalized to millions SGD for consistency
- Sector classifications standardized across years
- Missing data interpolated where appropriate
- Historical adjustments applied for comparability

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug or have a suggestion? [Open an issue](https://github.com/xuanx1/gahmenMOnies/issues)
2. **Improve Data**: Help update or validate the expenditure data
3. **Enhance Features**: Add new visualization options or improve existing ones
4. **Documentation**: Help improve this README or add code comments

### Development Setup
```bash
git clone https://github.com/xuanx1/gahmenMOnies.git
cd gahmenMOnies
# Make your changes
# Test locally using any HTTP server
# Submit a pull request
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Data Source**: Accountant-General's Department, Singapore
- **Visualization Framework**: D3.js community and contributors
- **Design Inspiration**: Modern data visualization best practices
- **Singapore Government**: For maintaining transparent financial reporting

---

<div align="center">
  <strong>📊 Explore Singapore's fiscal story through data visualization 📊</strong>
  <br><br>
  <a href="https://xuanx1.github.io/gahmenMOnies/">🔗 View Live Demo</a> •
  <a href="https://github.com/xuanx1/gahmenMOnies/issues">🐛 Report Bug</a> •
  <a href="https://github.com/xuanx1/gahmenMOnies/fork">🍴 Fork Project</a>
</div>
