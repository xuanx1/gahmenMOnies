# Singapore Government Expenditure Animated Sankey Visualization

An interactive, animated Sankey diagram showing Singapore's government operating expenditure flows across sectors and years from 1997 to 2025.

<img width="1211" height="3572" alt="screencapture-127-0-0-1-5500-2025-08-16-16_46_08" src="https://github.com/user-attachments/assets/12d9777f-00bc-4f28-b114-4596c334f5ad" />


## Features

🌊 **Animated Flow Visualization**: Watch government spending patterns evolve over nearly 3 decades
📊 **Interactive Controls**: Click years or play automated animations
🎨 **Beautiful Design**: Modern gradient styling with smooth transitions
📱 **Responsive Layout**: Works on different screen sizes
💫 **Hover Details**: Rich tooltips showing expenditure amounts

## Files

- `index.html` - Main webpage with styling and layout
- `government_sankey.js` - Core JavaScript logic for the Sankey diagram
- `government_expenditure.json` - Complete government expenditure data (1997-2025)
- `government_expenditure.csv` - Alternative CSV data format
- `README.md` - This documentation

## How to Use

1. **Open the visualization**: Open `index.html` in a web browser
2. **Select years**: Click any year button (1997, 2000, 2005, 2010, 2015, 2020, 2025)
3. **Play animation**: Click "▶ Play Animation" to see expenditure evolution over time
4. **Change speed**: Click "Speed" button to cycle through 1x, 2x, 0.5x speeds
5. **Explore details**: Hover over nodes and links for detailed expenditure information

## Data Structure

The visualization shows:
- **Left side**: Main government sectors (Social Development, Security & External Relations, Economic Development, Government Administration)
- **Right side**: Individual departments and ministries
- **Flows**: Expenditure amounts flowing from main sectors to specific departments

## Key Insights

- **Social Development** consistently represents the largest expenditure category
- **Health expenditure** shows dramatic growth, especially post-2015
- **Defence spending** remains substantial throughout all years
- **Digital Development** emerges as a significant category in recent years
- **Total expenditure** grows from $14B SGD in 1997 to $97B SGD in 2025

## Technical Details

- Built with **D3.js** for data visualization
- Uses **D3-Sankey** plugin for flow diagrams
- **Modern CSS** with backdrop filters and gradients
- **Smooth animations** with staggered transitions
- **Interactive tooltips** with detailed information

## Browser Requirements

- Modern web browser supporting ES6+ JavaScript
- WebGL support recommended for best performance
- Internet connection for Google Fonts

## Data Source

Singapore Government Operating Expenditure data from:
- **Source**: Accountant-General's Department, Singapore
- **Period**: Financial years 1997-2025
- **Currency**: Million Singapore Dollars (SGD)

---

*Created for interactive analysis of Singapore's government expenditure patterns over time.*
