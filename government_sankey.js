let expenditureData = [];
let filteredData = [];
let currentYear = 2025;
let isPlaying = false;
let animationSpeed = 1;
let playInterval;

// Color schemes
const sectorColors = {
    'Social Development': '#FF6B6B',
    'Security And External Relations': '#4ECDC4', 
    'Economic Development': '#45B7D1',
    'Government Administration': '#96CEB4'
};

const subsectorColors = {
    // Social Development
    'Education': '#FF8E8E',
    'Health': '#FF5757',
    'National Development': '#FF3333',
    'Sustainability And The Environment': '#FF7676',
    'Culture Community And Youth': '#FF9999',
    'Social And Family Development': '#FFAAAA',
    'Digital Development And Information': '#FFBBBB',
    'Manpower (Financial Security)': '#FFCCCC',
    
    // Security And External Relations
    'Defence': '#66D9D9',
    'Home Affairs': '#33CCCC',
    'Foreign Affairs': '#00BBBB',
    
    // Economic Development
    'Transport': '#6BC7E8',
    'Trade And Industry': '#4FB7D8',
    'Manpower (Excluding Financial Security)': '#33A7C8',
    
    // Government Administration
    'Finance': '#B8E6B8',
    'Law': '#A6DDA6',
    'Organs Of State': '#94D494',
    'Prime Minister\'s Office': '#82CB82'
};

const genderColors = {
    'Total': '#74B9FF',
    'Expenditure': '#FD79A8'
};

async function loadData() {
    try {
        // Check if D3 is loaded
        if (typeof d3 === 'undefined') {
            console.error('D3.js is not loaded. Please check your internet connection.');
            alert('D3.js library failed to load. Please check your internet connection and refresh the page.');
            return;
        }
        
        const response = await fetch('government_expenditure.json');
        expenditureData = await response.json();
        
        // Load reserves data
        const reservesResponse = await d3.csv('OfficialForeignReservesEndOfPeriodMonthly.csv');
        reservesData = processReservesData(reservesResponse);
        
        // Find current year data
        filteredData = expenditureData.find(d => d.year === currentYear);
        updateChart();
        createLineChart();
        
        // Load fiscal data and create fiscal chart
        await loadFiscalData();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading expenditure data. Please make sure government_expenditure.json is in the same directory.');
    }
}

// Create Sankey data structure
function createSankeyData() {
    if (!filteredData || !filteredData.sectors) {
        return { nodes: [], links: [] };
    }
    
    const nodes = [];
    const nodeMap = {};
    let nodeIndex = 0;
    
    // Create parent sector nodes (left side)
    filteredData.sectors.forEach(sector => {
        nodes.push({
            id: nodeIndex,
            name: sector.name,
            type: 'parent',
            value: sector.amount,
            color: sectorColors[sector.name] || '#95A5A6'
        });
        nodeMap[sector.name] = nodeIndex++;
    });
    
    // Create subsector nodes (right side)
    filteredData.sectors.forEach(sector => {
        sector.subsectors.forEach(subsector => {
            nodes.push({
                id: nodeIndex,
                name: subsector.name,
                type: 'subsector',
                value: subsector.amount,
                color: subsectorColors[subsector.name] || '#95A5A6',
                parent: sector.name
            });
            nodeMap[`${sector.name}-${subsector.name}`] = nodeIndex++;
        });
    });
    
    // Create links
    const links = [];
    filteredData.sectors.forEach(sector => {
        sector.subsectors.forEach(subsector => {
            links.push({
                source: nodeMap[sector.name],
                target: nodeMap[`${sector.name}-${subsector.name}`],
                value: subsector.amount
            });
        });
    });
    
    return { nodes, links };
}

// Update chart with animations
function updateChart() {
    console.log("updateChart called for year:", currentYear);
    filteredData = expenditureData.find(d => d.year === currentYear);
    console.log("filteredData found:", !!filteredData);
    
    // Update year display
    document.getElementById('yearDisplay').textContent = currentYear;
    
    // Update year button states
    document.querySelectorAll('.year-btn').forEach(btn => {
        btn.classList.toggle('active', +btn.dataset.year === currentYear);
    });
    
    // Check if this is the first render or an update
    const existingSvg = d3.select("#chart svg");
    
    if (existingSvg.empty()) {
        // First render - create everything from scratch
        d3.select("#chart").selectAll("*").remove();
        createSankey();
    } else {
        // Update with morphing transitions
        morphSankeyTransition();
    }
    
    // Update line chart with current year data
    updateLineChart();
    
    // Update fiscal chart with current year data
    updateFiscalChart();
}

function morphSankeyTransition() {
    console.log("=== PURE MORPHING - NO FADING ===");
    
    // Create new Sankey data for the current year
    const newSankeyData = createSankeyData();
    
    // Get chart dimensions (same as in createSankey)
    const margin = { top: 40, right: 40, bottom: 20, left: 40 };
    const chartContainer = document.getElementById('chart');
    const containerWidth = chartContainer ? chartContainer.clientWidth : window.innerWidth;
    const containerHeight = chartContainer ? chartContainer.clientHeight : window.innerHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;
    
    // Create sankey generator
    const sankey = d3.sankey()
        .nodeWidth(50)
        .nodePadding(50)
        .extent([[1, 1], [height - 1, width - 1]])
        .nodeAlign(d3.sankeyCenter)
        .nodeSort((a, b) => {
            if (a.type === 'parent' && b.type === 'parent') {
                const sectorOrder = {
                    'Social Development': 1,
                    'Security And External Relations': 2,
                    'Economic Development': 3,
                    'Government Administration': 4
                };
                return (sectorOrder[a.name] || 999) - (sectorOrder[b.name] || 999);
            }
            return 0;
        });
    
    // Process the new data
    const newGraph = sankey(newSankeyData);
    
    // Custom spacing: 20px for origin nodes (parent sectors) only
    const newOriginNodes = newGraph.nodes.filter(d => d.type === 'parent').sort((a, b) => a.x0 - b.x0);
    
    // Position origin nodes with 20px padding
    let currentY = 1;
    newOriginNodes.forEach((node, i) => {
        const nodeHeight = node.x1 - node.x0;
        node.x0 = currentY;
        node.x1 = currentY + nodeHeight;
        currentY += nodeHeight + 20; // 20px padding for origin nodes
    });
    
    // Filter out invalid data first
    const validNodes = newGraph.nodes.filter(d => d && d.name);
    const validLinks = newGraph.links.filter(d => d && d.source && d.target && d.source.name && d.target.name);
    
    // Get existing elements
    const svg = d3.select("#chart svg");
    const g = svg.select("g");
    
    // Create vertical sankey link function using newGraph data
    function verticalSankeyLinkMorph() {
        return function(d) {
            const sourceLinks = newGraph.links.filter(link => link.source === d.source);
            const targetLinks = newGraph.links.filter(link => link.target === d.target);
            
            let x0, x1;
            
            if (sourceLinks.length > 1) {
                const sortedSourceLinks = [...sourceLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedSourceLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedSourceLinks[i].width + 4; // Add 2px gap after each link
                }
                
                const linkStartX = d.source.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = d.source.y1 - (d.width / 2);
                x0 = Math.min(linkStartX, maxAllowedX);
            } else {
                x0 = d.source.y0 + (d.source.y1 - d.source.y0) / 2;
            }
            
            if (targetLinks.length > 1) {
                const sortedTargetLinks = [...targetLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedTargetLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedTargetLinks[i].width + 4; // Add 2px gap after each link
                }
                
                const linkStartX = d.target.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = d.target.y1 - (d.width / 2);
                x1 = Math.min(linkStartX, maxAllowedX);
            } else {
                x1 = d.target.y0 + (d.target.y1 - d.target.y0) / 2;
            }
            
            const y0 = d.source.x1;
            const y1 = d.target.x0;
            const yi = d3.interpolateNumber(y0, y1);
            const y2 = yi(0.5);
            return `M${x0},${y0}C${x0},${y2} ${x1},${y2} ${x1},${y1}`;
        };
    }
    
    // PURE MORPHING - Update data WITHOUT key functions to match original creation
    
    // Update gradients for new data
    const defs = svg.select("defs");
    
    // Update link gradients - SIMPLEST POSSIBLE
    const gradients = defs.selectAll("linearGradient[id^='gradient-']")
        .data(newGraph.links);
    
    gradients.transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .attr("x1", d => {
            const sourceNode = d.source;
            const sourceLinks = newGraph.links.filter(link => link.source === sourceNode);
            
            if (sourceLinks.length > 1) {
                const sortedSourceLinks = [...sourceLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedSourceLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedSourceLinks[i].width;
                }
                
                const linkStartX = sourceNode.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = sourceNode.y1 - (d.width / 2);
                return Math.min(linkStartX, maxAllowedX);
            } else {
                return sourceNode.y0 + (sourceNode.y1 - sourceNode.y0) / 2;
            }
        })
        .attr("y1", d => d.source.x1)
        .attr("x2", d => {
            const targetNode = d.target;
            const targetLinks = newGraph.links.filter(link => link.target === targetNode);
            
            if (targetLinks.length > 1) {
                const sortedTargetLinks = [...targetLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedTargetLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedTargetLinks[i].width;
                }
                
                const linkStartX = targetNode.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = targetNode.y1 - (d.width / 2);
                return Math.min(linkStartX, maxAllowedX);
            } else {
                return targetNode.y0 + (targetNode.y1 - targetNode.y0) / 2;
            }
        })
        .attr("y2", d => d.target.x0);
    
    // Update gradient colors
    gradients.select("stop[offset='0%']")
        .transition()
        .duration(500)
        .attr("stop-color", d => newGraph.nodes[d.source.index].color);
    
    gradients.select("stop[offset='100%']")
        .transition()
        .duration(500)
        .attr("stop-color", d => newGraph.nodes[d.target.index].color);
    
    // Update node gradients - SIMPLEST POSSIBLE
    const nodeGradients = defs.selectAll("linearGradient[id^='node-gradient-']")
        .data(newGraph.nodes);
    
    nodeGradients.select("stop[offset='100%']")
        .transition()
        .duration(500)
        .attr("stop-color", d => d.color);
    
    // Update links data and morph - SIMPLEST POSSIBLE
    const links = g.selectAll(".link")
        .data(newGraph.links);
    
    // Rebind event handlers with new data
    links.on("mouseover", function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", Math.max(2, d.width * 1.2));
            
        const tooltip = d3.select("#tooltip");
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`${d.source.name}<br/>↓<br/>${d.target.name}<br/>Amount: S$${(d.value / 1000).toFixed(2)}B`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
        d3.select(this)
            .transition()
            .duration(200)
            .attr("stroke-width", Math.max(1, d.width));
            
        const tooltip = d3.select("#tooltip");
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });
    
    links.transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .attr("d", verticalSankeyLinkMorph())
        .attr("stroke-width", d => Math.max(1, d.width));
    
    // Update link labels for destination nodes spelling upward
    const newDestinationLinksForLabels = newGraph.links.filter(d => d.target.type === 'subsector');
    
    const linkLabels = g.selectAll(".link-label")
        .data(newDestinationLinksForLabels);
    
    linkLabels.select("textPath")
        .transition()
        .duration(500)
        .text(d => {
            const targetNode = newGraph.nodes[d.target.index];
            return targetNode.name;
        });
    
    // Update nodes data and morph - SIMPLEST POSSIBLE
    const nodes = g.selectAll(".node")
        .data(newGraph.nodes);
    
    // Rebind event handlers with new data
    nodes.on("mouseover", function(event, d) {
        d3.select(this).select("rect")
            .transition()
            .duration(200)
            .attr("stroke", "#000")
            .attr("stroke-width", 2);
            
        const tooltip = d3.select("#tooltip");
        tooltip.transition()
            .duration(200)
            .style("opacity", .9);
        tooltip.html(`${d.name}<br/>Total: S$${(d.value / 1000).toFixed(2)}B`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function(event, d) {
        d3.select(this).select("rect")
            .transition()
            .duration(200)
            .attr("stroke", "none");
            
        const tooltip = d3.select("#tooltip");
        tooltip.transition()
            .duration(500)
            .style("opacity", 0);
    });
    
    nodes.transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .attr("transform", d => `translate(${d.y0},${d.x0})`);
    
    nodes.select("rect")
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .attr("height", d => {
            const fullHeight = d.x1 - d.x0;
            return d.type === 'subsector' ? fullHeight / 2 : fullHeight;
        })
        .attr("width", d => d.y1 - d.y0);
    
    // Update text positions and percentages to stay centered during morphing
    nodes.select(".node-text").each(function(d) {
        const g = d3.select(this);
        const totalExpenditure = filteredData.total_expenditure;
        const percentage = (d.value / totalExpenditure * 100).toFixed(1);
        
        // Update white background box position and size
        g.select("rect")
            .transition()
            .duration(500)
            .ease(d3.easeCubicInOut)
            .attr("x", (d.y1 - d.y0) / 2 - 25)
            .attr("y", (d.x1 - d.x0) / 2 - 35)
            .attr("width", 50)
            .attr("height", 20);

        // Update percentage text position, size, and value - properly centered
        g.select("text")
            .transition()
            .duration(500)
            .ease(d3.easeCubicInOut)
            .attr("x", (d.y1 - d.y0) / 2)
            .attr("y", (d.x1 - d.x0) / 2 - 25)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-size", "10px")
            .text(`${percentage}%`);
    });
    
    // Update origin node titles
    nodes.filter(d => d.type === 'parent').select(".origin-title")
        .transition()
        .duration(500)
        .ease(d3.easeCubicInOut)
        .attr("x", d => (d.y1 - d.y0) + 10)
        .attr("y", d => (d.x1 - d.x0) / 2)
        .each(function(d) {
            const text = d3.select(this);
            const words = d.name.split(' ');
            const midpoint = Math.ceil(words.length / 2);
            const line1 = words.slice(0, midpoint).join(' ');
            const line2 = words.slice(midpoint).join(' ');
            
            text.select("tspan:first-child")
                .attr("x", (d.y1 - d.y0) + 10)
                .text(line1);
            
            if (line2) {
                text.select("tspan:last-child")
                    .attr("x", (d.y1 - d.y0) + 10)
                    .text(line2);
            }
        });
    
    // Update title
    const titleDiv = d3.select("#chart div");
    if (!titleDiv.empty()) {
        const totalExpenditure = filteredData.total_expenditure;
        titleDiv.html(`Total expenditure<br><span style='font-family: "Playfair Display", Georgia, serif; font-size: 26px; font-weight: 900; color: #000; letter-spacing: -0.5px; text-transform: none;'><span style='color: #1A3A6C;'>${currentYear}</span> &middot; S$${(totalExpenditure / 1000).toFixed(2)}B</span>`);
    }
}

function createSankey() {
    if (!filteredData || !filteredData.sectors) {
        d3.select("#chart")
            .append("div")
            .style("position", "absolute")
            .style("top", "50%")
            .style("left", "50%")
            .style("transform", "translate(-50%, -50%)")
            .style("text-align", "center")
            .style("padding", "50px")
            .style("color", "#333")
            .style("font-size", "18px")
            .style("font-weight", "600")
            .text("No data available for the selected year.");
        return;
    }
    
    // Create Sankey data
    const sankeyData = createSankeyData();
    
    const parentNodes = sankeyData.nodes.filter(d => d.type === 'parent');
    const subsectorNodes = sankeyData.nodes.filter(d => d.type === 'subsector');
    
    // Scale adjustment for better visualization
    if (parentNodes.length > 0 && subsectorNodes.length > 0) {
        const totalParentValue = parentNodes.reduce((sum, d) => sum + d.value, 0);
        const totalSubsectorValue = subsectorNodes.reduce((sum, d) => sum + d.value, 0);
        
        // No scaling needed since values should already match
        console.log(`Parent total: ${totalParentValue}, Subsector total: ${totalSubsectorValue}`);
    }
    
    // Chart dimensions for vertical layout
    const margin = { top: 40, right: 40, bottom: 20, left: 40 };
    const chartContainer = document.getElementById('chart');
    const containerWidth = chartContainer ? chartContainer.clientWidth : window.innerWidth;
    const containerHeight = chartContainer ? chartContainer.clientHeight : window.innerHeight;
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("display", "block");

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create vertical Sankey
    const sankey = d3.sankey()
        .nodeWidth(50)
        .nodePadding(50)
        .extent([[1, 1], [height - 1, width - 1]]) // Swapped for vertical
        .nodeAlign(d3.sankeyCenter)
        .nodeSort((a, b) => {
            if (a.type === 'parent' && b.type === 'parent') {
                // Fixed order for parent sectors to prevent position flipping
                const sectorOrder = {
                    'Social Development': 1,
                    'Security And External Relations': 2,
                    'Economic Development': 3,
                    'Government Administration': 4
                };
                
                const orderA = sectorOrder[a.name] || 999;
                const orderB = sectorOrder[b.name] || 999;
                
                return orderA - orderB;
            }
            if (a.type === 'subsector' && b.type === 'subsector') {
                if (a.parent === b.parent) {
                    return b.value - a.value;
                }
                return 0;
            }
            return 0;
        });
    
    const graph = sankey(sankeyData);
    
    // Custom spacing: 20px for origin nodes (parent sectors) only
    const originNodes = graph.nodes.filter(d => d.type === 'parent').sort((a, b) => a.x0 - b.x0);
    
    // Position origin nodes with 20px padding
    let currentY = 1;
    originNodes.forEach((node, i) => {
        const nodeHeight = node.x1 - node.x0;
        node.x0 = currentY;
        node.x1 = currentY + nodeHeight;
        currentY += nodeHeight + 20; // 20px padding for origin nodes
    });
    
    // Tooltip
    const tooltip = d3.select("#tooltip");

    const defs = svg.append("defs");
    
    // Create gradients for vertical links
    const gradients = defs.selectAll("linearGradient")
        .data(graph.links)
        .enter().append("linearGradient")
        .attr("id", (d, i) => `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", d => {
            // Match the cumulative stacking link positioning
            const sourceNode = d.source;
            const sourceLinks = graph.links.filter(link => link.source === sourceNode);
            
            if (sourceLinks.length > 1) {
                const sortedSourceLinks = [...sourceLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedSourceLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedSourceLinks[i].width;
                }
                
                const linkStartX = sourceNode.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = sourceNode.y1 - (d.width / 2);
                return Math.min(linkStartX, maxAllowedX);
            } else {
                return sourceNode.y0 + (sourceNode.y1 - sourceNode.y0) / 2;
            }
        })
        .attr("y1", d => d.source.x1)
        .attr("x2", d => {
            // Match the cumulative stacking link positioning
            const targetNode = d.target;
            const targetLinks = graph.links.filter(link => link.target === targetNode);
            
            if (targetLinks.length > 1) {
                const sortedTargetLinks = [...targetLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedTargetLinks.indexOf(d);
                
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedTargetLinks[i].width;
                }
                
                const linkStartX = targetNode.y0 + cumulativeWidth + (d.width / 2);
                const maxAllowedX = targetNode.y1 - (d.width / 2);
                return Math.min(linkStartX, maxAllowedX);
            } else {
                return targetNode.y0 + (targetNode.y1 - targetNode.y0) / 2;
            }
        })
        .attr("y2", d => d.target.x0);
    
    gradients.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d => graph.nodes[d.source.index].color)
        .attr("stop-opacity", 0.8);
    
    gradients.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", d => graph.nodes[d.target.index].color)
        .attr("stop-opacity", 0.6);

    // Custom vertical Sankey link function with corrected positioning
    function verticalSankeyLink() {
        return function(d) {
            // Get all links from source and to target for proper distribution
            const sourceNode = d.source;
            const targetNode = d.target;
            
            const sourceLinks = graph.links.filter(link => link.source === sourceNode);
            const targetLinks = graph.links.filter(link => link.target === targetNode);
            
            // Find the index of current link
            const sourceLinkIndex = sourceLinks.indexOf(d);
            const targetLinkIndex = targetLinks.indexOf(d);
            
            let x0, x1;
            
            // Stack source links side by side with no overlap
            if (sourceLinks.length > 1) {
                const sourceNodeWidth = sourceNode.y1 - sourceNode.y0;
                // Sort links by value to ensure consistent ordering
                const sortedSourceLinks = [...sourceLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedSourceLinks.indexOf(d);
                
                // Calculate cumulative width of all previous links with 2px gaps
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedSourceLinks[i].width + 4; // Add 2px gap after each link
                }
                
                // Position this link right after the previous ones
                const linkStartX = sourceNode.y0 + cumulativeWidth + (d.width / 2);
                
                // Ensure it doesn't exceed node bounds
                const maxAllowedX = sourceNode.y1 - (d.width / 2);
                x0 = Math.min(linkStartX, maxAllowedX);
            } else {
                x0 = sourceNode.y0 + (sourceNode.y1 - sourceNode.y0) / 2;
            }
            
            // Stack target links side by side with no overlap
            if (targetLinks.length > 1) {
                const targetNodeWidth = targetNode.y1 - targetNode.y0;
                // Sort links by value to ensure consistent ordering
                const sortedTargetLinks = [...targetLinks].sort((a, b) => b.value - a.value);
                const sortedIndex = sortedTargetLinks.indexOf(d);
                
                // Calculate cumulative width of all previous links
                let cumulativeWidth = 0;
                for (let i = 0; i < sortedIndex; i++) {
                    cumulativeWidth += sortedTargetLinks[i].width;
                }
                
                // Position this link right after the previous ones
                const linkStartX = targetNode.y0 + cumulativeWidth + (d.width / 2);
                
                // Ensure it doesn't exceed node bounds
                const maxAllowedX = targetNode.y1 - (d.width / 2);
                x1 = Math.min(linkStartX, maxAllowedX);
            } else {
                x1 = targetNode.y0 + (targetNode.y1 - targetNode.y0) / 2;
            }
            
            const y0 = d.source.x1;
            const y1 = d.target.x0;
            const yi = d3.interpolateNumber(y0, y1);
            const y2 = yi(0.5);
            
            return `M${x0},${y0}C${x0},${y2} ${x1},${y2} ${x1},${y1}`;
        };
    }

    // Draw links with scaling animation
    const linkGroup = g.append("g");
    
    const links = linkGroup.selectAll(".link")
        .data(graph.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("id", (d, i) => `destination-link-${i}`)
        .attr("d", verticalSankeyLink())
        .attr("stroke", (d, i) => `url(#gradient-${i})`)
        .attr("stroke-width", 0) // Start with 0 width for scaling effect
        .style("fill", "none")
        .style("stroke-opacity", 0.8)
        .on("mouseover", function(event, d) {
            // Scale up on hover
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke-width", Math.max(2, d.width * 1.2));
                
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`${d.source.name}<br/>↓<br/>${d.target.name}<br/>Amount: S$${(d.value / 1000).toFixed(2)}B`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Scale back to normal
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke-width", Math.max(1, d.width));
                
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Animate links with scaling based on volume
    links.transition()
        .duration(1500)
        .delay((d, i) => i * 50)
        .attr("stroke-width", d => Math.max(1, d.width))
        .ease(d3.easeElasticOut.amplitude(1).period(0.3));
    
    // Create label group for destination node links spelling upward
    const labelGroup = g.append("g").attr("class", "link-labels");
    
    // Filter links going to destination nodes (subsector nodes)
    const destinationLinksForLabels = graph.links.filter(d => d.target.type === 'subsector');
    
    labelGroup.selectAll("text")
        .data(destinationLinksForLabels)
        .enter().append("text")
        .attr("class", "link-label")
        .style("font-size", "9px")
        .style("font-weight", "bold")
        .style("font-family", "'Inter', sans-serif")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "2px")
        .style("fill", "white")
        .style("opacity", 0.9)
        .attr("dy", d => {
            const sourceNode = graph.nodes[d.source.index];
            const targetNode = graph.nodes[d.target.index];
            
            // Custom offset for Health specifically
            if (targetNode.name === 'Health') {
                return "-28px";
            } else if (targetNode.name === 'Education') {
                return "-25px";
            } else if (targetNode.name === 'Defence') {
                return "-32px";
            } else if (targetNode.name === 'Home Affairs') {
                return "-19px";
            } else if (targetNode.name === 'National Development') {
                return "-19px";
            } else if (targetNode.name === 'Sustainability And The Environment') {
                return "-11px";
            } else if (targetNode.name === 'Digital Development And Information') {
                return "-11px";
            } else if (sourceNode.name === 'Social Development') {
                return "-70px";
            } else if (sourceNode.name === 'Security And External Relations' || sourceNode.name === 'Economic Development') {
                return "-6px";
            } else if (sourceNode.name === 'Government Administration') {
                return "-4px";
            } else {
                return "-3px";
            }
        })
        .append("textPath")
        .attr("href", (d, i) => `#destination-link-${graph.links.indexOf(d)}`)
        .attr("startOffset", "97%")
        .style("text-anchor", "end")
        .style("transform", "rotate(180deg)")
        .style("transform-origin", "center")
        .text(d => {
            const targetNode = graph.nodes[d.target.index];
            return targetNode.name;
        });
    
    // Draw nodes with scaling animation for vertical layout
    const nodeGroup = g.append("g");
    
    const nodes = nodeGroup.selectAll(".node")
        .data(graph.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y0},${d.x0})`); // Swapped x,y for vertical

    nodes.append("rect")
        .attr("width", 0) // Start with 0 width for scaling effect
        .attr("height", d => {
            const fullHeight = d.x1 - d.x0;
            return d.type === 'subsector' ? fullHeight / 2 : fullHeight;
        }) // Half height for destination nodes
        .style("fill", d => d.color)
        .style("stroke", "rgba(0, 0, 0, 0.12)")
        .style("stroke-width", "2")
        .on("mouseover", function(event, d) {
            // Just show tooltip, no scaling
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke", "#000")
                .attr("stroke-width", 2);
                
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`${d.name}<br/>Total: S$${(d.value / 1000).toFixed(2)}B<br/>Year: ${currentYear}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            // Remove border highlight
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke", "rgba(0, 0, 0, 0.12)")
                .attr("stroke-width", 2);
                
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    // Animate nodes with scaling based on volume
    nodes.select("rect")
        .transition()
        .duration(1200)
        .delay((d, i) => i * 80)
        .attr("width", d => d.y1 - d.y0) // Width scales with value
        .ease(d3.easeBounceOut);

    // Add node labels for vertical layout (for both source and destination nodes)
    const nodeTexts = nodes.append("g")
        .attr("class", "node-text")
        .style("opacity", 0);
    
    nodeTexts.each(function(d) {
        const g = d3.select(this);
        const totalExpenditure = filteredData.total_expenditure;
        const percentage = (d.value / totalExpenditure * 100).toFixed(1);
        
        // Add white background box for percentage
        g.append("rect")
            .attr("x", (d.y1 - d.y0) / 2 - 25)
            .attr("y", (d.x1 - d.x0) / 2 - 35)
            .attr("width", 50)
            .attr("height", 20)
            .attr("rx", 10)
            .attr("ry", 10)
            .style("fill", "white")
            .style("stroke", "rgba(0,0,0,0.1)")
            .style("stroke-width", 1)
            .style("opacity", 0.95);
        
        // Add percentage - properly centered in white box
        g.append("text")
            .attr("x", (d.y1 - d.y0) / 2)
            .attr("y", (d.x1 - d.x0) / 2 - 25)
            .attr("text-anchor", "middle")
            .attr("dominant-baseline", "middle")
            .style("font-family", "'Inter', sans-serif")
            .style("font-size", "10px")
            .style("font-weight", "700")
            .style("fill", "#333")
            .text(`${percentage}%`);
    });
    
    nodeTexts.transition()
        .duration(800)
        .delay((d, i) => i * 80 + 500)
        .style("opacity", 1);
    
    // Add titles to origin nodes (parent sectors) to the right of the boxes
    const originNodeElements = nodes.filter(d => d.type === 'parent');
    
    const originTitles = originNodeElements.append("text")
        .attr("class", "origin-title")
        .attr("x", d => (d.y1 - d.y0) + 10) // 10px to the right of the node box
        .attr("y", d => (d.x1 - d.x0) / 2)
        .attr("text-anchor", "start")
        .attr("dominant-baseline", "middle")
        .style("font-size", "11px")
        .style("font-weight", "700")
        .style("font-family", "'Roboto Condensed', 'Roboto', Arial, sans-serif")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "1.2px")
        .style("fill", "#111")
        .style("opacity", 0);

    // Add text spans for 2-line titles
    originTitles.each(function(d) {
        const text = d3.select(this);
        const words = d.name.split(' ');
        const midpoint = Math.ceil(words.length / 2);
        const line1 = words.slice(0, midpoint).join(' ');
        const line2 = words.slice(midpoint).join(' ');
        
        text.append("tspan")
            .attr("x", (d.y1 - d.y0) + 10)
            .attr("dy", "-0.3em")
            .text(line1);
        
        if (line2) {
            text.append("tspan")
                .attr("x", (d.y1 - d.y0) + 10)
                .attr("dy", "1.2em")
                .text(line2);
        }
    });
    
    // Animate origin titles
    originTitles.transition()
        .duration(800)
        .delay((d, i) => i * 100 + 1000)
        .style("opacity", 0.9);
    
    // Add title for vertical layout
    const totalExpenditure = filteredData.total_expenditure;
    
    const titleDiv = d3.select("#chart")
        .append("div")
        .style("position", "absolute")
        .style("right", "20px")
        .style("top", "16px")
        .style("transform", "none")
        .style("text-align", "right")
        .style("font-size", "13px")
        .style("font-weight", "700")
        .style("font-family", "'Roboto Condensed', 'Roboto', Arial, sans-serif")
        .style("text-transform", "uppercase")
        .style("letter-spacing", "1.5px")
        .style("color", "#5a5a5a")
        .style("line-height", "1.3")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .html(`Total expenditure<br><span style='font-family: "Playfair Display", Georgia, serif; font-size: 26px; font-weight: 900; color: #000; letter-spacing: -0.5px; text-transform: none;'><span style='color: #1A3A6C;'>${currentYear}</span> &middot; S$${(totalExpenditure / 1000).toFixed(2)}B</span>`);

    titleDiv.transition()
        .duration(1000)
        .style("opacity", 1);

}

// Animation controls
function playAnimation() {
    if (isPlaying) {
        stopAnimation();
        return;
    }
    
    isPlaying = true;
    document.getElementById('playBtn').textContent = '⏸';
    
    const years = expenditureData.map(d => d.year).sort((a, b) => a - b);
    let currentIndex = years.indexOf(currentYear);
    
    playInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % years.length;
        currentYear = years[currentIndex];
        updateChart();
        
        // Slider position update
        document.getElementById('yearSlider').value = currentYear;
    }, 1000 / animationSpeed);
}

function stopAnimation() {
    isPlaying = false;
    document.getElementById('playBtn').textContent = '▶';
    clearInterval(playInterval);
}

function changeSpeed() {
    animationSpeed = animationSpeed === 1 ? 2 : animationSpeed === 2 ? 0.5 : 1;
    document.getElementById('speedBtn').textContent = `Speed: ${animationSpeed}x`;
    
    if (isPlaying) {
        stopAnimation();
        playAnimation();
    }
}

// Line Chart Creation
function createLineChart() {
    if (!expenditureData || expenditureData.length === 0) {
        console.error('No expenditure data available for line chart');
        return;
    }
    
    // Clear any existing content
    d3.select("#lineChart").selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const containerWidth = document.getElementById('lineChart').clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    // Create SVG structure
    const svg = d3.select("#lineChart")
        .style("background", "rgba(255,255,255,0)")
        .style("display", "block")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 80);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Create containers
    g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
    g.append("g").attr("class", "y-axis");
    g.append("g").attr("class", "lines");
    g.append("g").attr("class", "dots");
    g.append("g").attr("class", "legend").attr("transform", `translate(0, ${height + 50})`);
    
    // Add axis labels
    g.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#666")
        .text("Expenditure S$ (Billions)");
    
    // X-axis label removed for cleaner appearance
    
    // Initial update
    updateLineChart();
}

// Update Line Chart based on current year
function updateLineChart() {
    const svg = d3.select("#lineChart svg");
    if (svg.empty()) return;
    
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const containerWidth = document.getElementById('lineChart').clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const g = svg.select("g");
    
    // Filter data up to current year
    const allYears = expenditureData.map(d => d.year).sort((a, b) => a - b);
    const years = allYears.filter(year => year <= currentYear);
    
    // Get all unique department names across all years and sectors
    const departmentNames = new Set();
    expenditureData.forEach(yearData => {
        if (yearData.sectors) {
            yearData.sectors.forEach(sector => {
                if (sector.subsectors) {
                    sector.subsectors.forEach(subsector => {
                        departmentNames.add(subsector.name);
                    });
                }
            });
        }
    });
    
    // Transform data for line chart (individual departments)
    const lineData = Array.from(departmentNames).map(departmentName => {
        const values = years.map(year => {
            const yearData = expenditureData.find(d => d.year === year);
            if (!yearData || !yearData.sectors) return { year, value: 0 };
            
            let departmentAmount = 0;
            yearData.sectors.forEach(sector => {
                if (sector.subsectors) {
                    const department = sector.subsectors.find(sub => sub.name === departmentName);
                    if (department) {
                        departmentAmount = department.amount;
                    }
                }
            });
            
            return {
                year,
                value: departmentAmount / 1000  // Convert to billions
            };
        });
        
        // Get the department color from subsectorColors, fallback to a default
        const departmentColor = subsectorColors[departmentName] || '#95A5A6';
        
        return {
            name: departmentName,
            color: departmentColor,
            values
        };
    });
    
    // Dynamic scales based on filtered data
    const xScale = d3.scaleLinear()
        .domain(d3.extent(years))
        .range([0, width]);
    
    // Use logarithmic scale to better distribute low-expenditure ministries
    const maxValue = d3.max(lineData, d => d3.max(d.values, v => v.value));
    const minValue = d3.min(lineData, d => d3.min(d.values, v => v.value > 0 ? v.value : null)) || 0.01;
    
    const yScale = d3.scaleLog()
        .domain([Math.max(minValue, 0.01), maxValue]) // Ensure minimum is above 0 for log scale
        .range([height, 0])
        .clamp(true);
    
    // Line generator with special handling for zero values
    const line = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(Math.max(d.value, 0.01))) // Ensure minimum value for log scale
        .curve(d3.curveMonotoneX)
        .defined(d => d.value > 0); // Only draw line for positive values
    
    // Update axes with transitions
    g.select(".x-axis")
        .transition()
        .duration(800)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Get min and max values for custom ticks
    const yDomain = yScale.domain();
    const tickMinValue = yDomain[0];
    const tickMaxValue = yDomain[1];
    
    g.select(".y-axis")
        .transition()
        .duration(800)
        .call(d3.axisLeft(yScale)
            .tickValues([tickMinValue, tickMaxValue])
            .tickFormat(d => {
                if (d >= 10) {
                    return d.toFixed(0) + "B";
                } else if (d >= 1) {
                    return d.toFixed(0) + "B";
                } else if (d >= 0.1) {
                    return (d * 10).toFixed(0) + "0M";
                } else if (d >= 0.01) {
                    return (d * 100).toFixed(0) + "0M";
                } else {
                    return (d * 1000).toFixed(0) + "M";
                }
            }))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Update lines with hover functionality
    const lines = g.select(".lines").selectAll(".line").data(lineData, d => d.name);
    
    console.log("Line data:", lineData.length, "departments");
    console.log("Existing lines:", lines.size());
    
    const allLines = lines.enter()
        .append("path")
        .attr("class", "line")
        .style("fill", "none")
        .style("stroke", d => d.color)
        .style("stroke-width", 3)
        .style("opacity", 0.8)
        .style("cursor", "pointer")
        .merge(lines);
    
    console.log("All lines after merge:", allLines.size());
    
    // Apply event handlers to all lines (new and existing)
    allLines
        .on("mouseover", function(event, d) {
            console.log("Line mouseover triggered", d.name);
            
            // Grey out all other lines
            allLines
                .style("opacity", function(lineData) {
                    return lineData.name === d.name ? 1 : 0.2;
                })
                .style("stroke-width", function(lineData) {
                    return lineData.name === d.name ? 5 : 3;
                });
            
            // Create tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "line-tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "8px 12px")
                .style("border-radius", "4px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("opacity", 0);
            
            // Get mouse position relative to the line chart SVG
            const svgRect = svg.node().getBoundingClientRect();
            const mouseX = event.clientX - svgRect.left - margin.left;
            
            console.log("Mouse X:", mouseX, "SVG rect:", svgRect);
            
            // Convert mouse X position to year
            const hoveredYear = xScale.invert(mouseX);
            console.log("Hovered year:", hoveredYear);
            
            // Find closest data point to hovered year
            const bisect = d3.bisector(data => data.year).left;
            const i = bisect(d.values, hoveredYear, 1);
            
            console.log("Bisect index:", i, "Data length:", d.values.length);
            
            // Handle edge cases
            let closestData;
            if (i === 0) {
                closestData = d.values[0];
            } else if (i >= d.values.length) {
                closestData = d.values[d.values.length - 1];
            } else {
                const d0 = d.values[i - 1];
                const d1 = d.values[i];
                closestData = hoveredYear - d0.year > d1.year - hoveredYear ? d1 : d0;
            }
            
            console.log("Closest data:", closestData);
            
            if (closestData) {
                tooltip.html(`${d.name}<br/>Year: ${closestData.year}<br/>Amount: S$${closestData.value >= 1 ? closestData.value.toFixed(2) + "B" : (closestData.value * 1000).toFixed(0) + "M"}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px")
                    .transition()
                    .duration(200)
                    .style("opacity", 1);
            }
        })
        .on("mouseout", function(event, d) {
            // Reset all lines to normal appearance
            allLines
                .style("stroke-width", 3)
                .style("opacity", 0.8);
            
            // Remove tooltip
            d3.selectAll(".line-tooltip").remove();
        })
        .transition()
        .duration(800)
        .attr("d", d => line(d.values));
    
    lines.exit().remove();
    
    // Update legend (create once)
    const legend = g.select(".legend");
    if (legend.selectAll(".legend-item").empty()) {
        const lineSpacing = 18; // Space between legend lines
        const itemsPerLine = Math.ceil(lineData.length / 4); // Split into 4 lines for more space
        
        // Calculate spacing based on available width
        const availableWidth = width * 0.9; 
        const itemSpacing = availableWidth / itemsPerLine + 20; // Dynamic spacing based on width
        
        const legendItems = legend.selectAll(".legend-item")
            .data(lineData)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", function(d, i) {
                const lineNumber = Math.floor(i / itemsPerLine);
                const positionInLine = i % itemsPerLine;
                
                const x = positionInLine * itemSpacing;
                const y = lineNumber * lineSpacing;
                
                return `translate(${x}, ${y})`;
            });
        
        // Center the entire legend at the bottom
        const totalLegendWidth = (itemsPerLine - 1) * itemSpacing;
        const legendStartX = (width - totalLegendWidth) / 2 - 70; // Move left 30px
        legend.attr("transform", `translate(${legendStartX}, ${height + 50})`); // Moved up 10px (60 - 10)
        
        legendItems.append("rect")
            .attr("width", 15)
            .attr("height", 3)
            .style("fill", d => d.color);
        
        legendItems.append("text")
            .attr("x", 20)
            .attr("y", 2)
            .attr("dy", "0.35em")
            .style("font-family", "'Inter', sans-serif")
            .style("font-size", "10px")
            .style("fill", "#666")
            .text(d => d.name);
        
        // Add hover functionality to legend items
        legendItems
            .style("cursor", "pointer")
            .on("mouseover", function(event, d) {
                // Grey out all lines except the one corresponding to this legend item
                allLines
                    .style("opacity", function(lineData) {
                        return lineData.name === d.name ? 1 : 0.2;
                    })
                    .style("stroke-width", function(lineData) {
                        return lineData.name === d.name ? 5 : 3;
                    });
                
                // Highlight this legend item
                d3.select(this).select("text")
                    .style("font-weight", "bold")
                    .style("fill", "#333");
                d3.select(this).select("rect")
                    .style("opacity", 1);
            })
            .on("mouseout", function(event, d) {
                // Reset all lines to normal appearance
                allLines
                    .style("stroke-width", 3)
                    .style("opacity", 0.8);
                
                // Reset this legend item
                d3.select(this).select("text")
                    .style("font-weight", "normal")
                    .style("fill", "#666");
                d3.select(this).select("rect")
                    .style("opacity", 1);
            });
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', loadData);

document.getElementById('playBtn').addEventListener('click', playAnimation);
document.getElementById('speedBtn').addEventListener('click', changeSpeed);

// Add the missing year slider event listener
document.getElementById('yearSlider').addEventListener('input', (e) => {
    currentYear = +e.target.value;
    updateChart();
    if (isPlaying) {
        stopAnimation();
    }
});

document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        currentYear = +e.target.dataset.year;
        updateChart();
        if (isPlaying) {
            stopAnimation();
        }
    });
});

// Handle window resize — clear existing SVG so it gets recreated at the new container size
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (!isPlaying) {
            d3.select("#chart").selectAll("svg").remove();
            d3.select("#lineChart").selectAll("svg").remove();
            d3.select("#fiscalChart").selectAll("svg").remove();
            updateChart();
            if (typeof createLineChart === 'function') createLineChart();
            if (typeof createFiscalChart === 'function' && fiscalData && fiscalData.length) createFiscalChart();
        }
    }, 150);
});

// Fiscal Chart Functionality
let fiscalData = [];
let reservesData = [];

function processReservesData(csvData) {
    // Transform CSV data to yearly data (take December values, or latest available for current year)
    const yearlyData = [];
    
    // Parse headers to get years and months
    const headers = Object.keys(csvData[0]);
    
    // Find December columns for each year from 1997 to 2025
    for (let year = 1997; year <= 2025; year++) {
        let dataCol = headers.find(h => h === `${year}Dec`);
        
        // For 2025, use the latest available month data since December might not be available yet
        if (!dataCol && year === 2025) {
            // Try to find the latest month available for 2025
            const monthsToTry = ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan'];
            for (const month of monthsToTry) {
                dataCol = headers.find(h => h === `${year}${month}`);
                if (dataCol) break;
            }
        }
        
        if (dataCol && csvData[0][dataCol]) {
            yearlyData.push({
                year: year,
                value: parseFloat(csvData[0][dataCol]) / 1000 // Convert to billions
            });
        }
    }
    
    console.log('Reserves data processed:', yearlyData.length, 'years', yearlyData.slice(-3)); // Show last 3 years
    return yearlyData;
}

async function loadFiscalData() {
    try {
        const response = await fetch('GovernmentFiscalPosition.csv');
        const csvText = await response.text();
        
        const rows = csvText.trim().split('\n');
        const header = rows[0].split(',');
        
        const parsed = rows.slice(1).map(row => {
            const values = row.split(',');
            return {
                year: parseInt(values[0]),
                category: values[2],
                item: values[3],
                amount: parseFloat(values[4])
            };
        });
        
        // Filter for Operating Revenue and Total Expenditure
        const revenueData = parsed.filter(d => d.item === 'Operating Revenue');
        const expenditureData = parsed.filter(d => d.item === 'Total Expenditure');
        
        // Combine the data by year
        fiscalData = revenueData.map(rev => {
            const exp = expenditureData.find(e => e.year === rev.year);
            return {
                year: rev.year,
                revenue: rev.amount / 1000, // Convert to billions
                expenditure: exp ? exp.amount / 1000 : 0 // Convert to billions
            };
        });
        
        console.log('Fiscal data loaded:', fiscalData.length, 'years');
        createFiscalChart();
    } catch (error) {
        console.error('Error loading fiscal data:', error);
        d3.select("#fiscalChart").html('<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">Failed to load fiscal data</div>');
    }
}

function createFiscalChart() {
    if (!fiscalData || fiscalData.length === 0) {
        console.error('No fiscal data available for chart');
        return;
    }
    
    // Clear any existing content
    d3.select("#fiscalChart").selectAll("*").remove();
    
    // Set up dimensions
    const margin = { top: 20, right: 80, bottom: 15, left: 80 };
    const containerWidth = document.getElementById('fiscalChart').clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    
    // Create SVG structure
    const svg = d3.select("#fiscalChart")
        .style("background", "rgba(255,255,255,0)")
        .style("display", "block")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom + 80);
    
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    
    // Filter data up to current year
    const filteredFiscalData = fiscalData.filter(d => d.year <= currentYear);
    const filteredReservesData = reservesData.filter(d => d.year <= currentYear);
    
    // Set up scales - separate scales for fiscal and reserves data
    const maxFiscal = d3.max(filteredFiscalData, d => Math.max(d.revenue, d.expenditure));
    const maxReserves = d3.max(filteredReservesData, d => d.value);
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(filteredFiscalData, d => d.year))
        .range([0, width]);
    
    // Left y-axis for fiscal data (revenue & expenditure)
    const yScale = d3.scaleLinear()
        .domain([0, maxFiscal])
        .range([height, 0]);
    
    // Right y-axis for reserves data
    const yScaleReserves = d3.scaleLinear()
        .domain([0, maxReserves])
        .range([height, 0]);
    
    // Line generators
    const revenueLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.revenue))
        .curve(d3.curveMonotoneX);
    
    const expenditureLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.expenditure))
        .curve(d3.curveMonotoneX);
    
    const reservesLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleReserves(d.value))
        .curve(d3.curveMonotoneX);
    
    // Add axes
    const uniqueYears = [...new Set(filteredFiscalData.map(d => d.year))].sort((a, b) => a - b);
    const filteredYears = uniqueYears.filter(year => year !== 1997 && year !== 2025);
    const every2Years = filteredYears.filter((year, index) => (year - 1998) % 2 === 0);
    
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).tickValues(every2Years))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale).tickFormat(d => d + "B").ticks(5))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Add right y-axis for reserves
    g.append("g")
        .attr("class", "y-axis-right")
        .attr("transform", `translate(${width}, 0)`)
        .call(d3.axisRight(yScaleReserves).tickFormat(d => d + "B").ticks(5))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Add axis labels
    g.append("text")
        .attr("class", "y-label")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x", 0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#666")
        .text("Revenue & Expenditure S$ (Billions)");
    
    // Add right y-axis label
    g.append("text")
        .attr("class", "y-label-right")
        .attr("transform", "rotate(-90)")
        .attr("y", width + margin.right)
        .attr("x", 0 - (height / 2))
        .attr("dy", "-1em")
        .style("text-anchor", "middle")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("fill", "#666")
        .text("Foreign Reserves S$ (Billions)");
    
    // Create defs for patterns
    const defs = svg.append("defs");
    
    // Define green hatch pattern for surplus
    const surplusPattern = defs.append("pattern")
        .attr("id", "surplusHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8)
        .attr("height", 8);
    
    surplusPattern.append("path")
        .attr("d", "M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2")
        .attr("stroke", "#4ECDC4")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.8);
    
    // Define red hatch pattern for deficit
    const deficitPattern = defs.append("pattern")
        .attr("id", "deficitHatch")
        .attr("patternUnits", "userSpaceOnUse")
        .attr("width", 8)
        .attr("height", 8);
    
    deficitPattern.append("path")
        .attr("d", "M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2")
        .attr("stroke", "#FF6B6B")
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.8);
    
    // Create area between lines (intersecting area) - Use a single path with pattern switching
    const areaGenerator = d3.area()
        .x(d => xScale(d.year))
        .y0(d => yScale(Math.min(d.revenue, d.expenditure)))
        .y1(d => yScale(Math.max(d.revenue, d.expenditure)))
        .curve(d3.curveMonotoneX);

    // Create a single continuous area with pattern masks
    const intersectionPath = g.append("path")
        .datum(filteredFiscalData)
        .attr("class", "intersecting-area")
        .attr("d", areaGenerator)
        .attr("fill", "url(#surplusHatch)")
        .style("opacity", 0.7)
        .style("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .style("opacity", .9)
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        });

    // Create clipPaths for surplus and deficit regions
    const clipSurplus = defs.append("clipPath")
        .attr("id", "surplusClip");
    
    const clipDeficit = defs.append("clipPath")
        .attr("id", "deficitClip");

    // Build the clip paths based on surplus/deficit status
    filteredFiscalData.forEach((d, i) => {
        if (i < filteredFiscalData.length - 1) {
            const nextD = filteredFiscalData[i + 1];
            const surplus = d.revenue - d.expenditure;
            const isSurplus = surplus > 0;
            
            // Create rectangles for clipping
            const rectX = xScale(d.year);
            const rectWidth = xScale(nextD.year) - xScale(d.year);
            const rectY = 0;
            const rectHeight = height;
            
            if (isSurplus) {
                clipSurplus.append("rect")
                    .attr("x", rectX)
                    .attr("y", rectY)
                    .attr("width", rectWidth)
                    .attr("height", rectHeight);
            } else {
                clipDeficit.append("rect")
                    .attr("x", rectX)
                    .attr("y", rectY)
                    .attr("width", rectWidth)
                    .attr("height", rectHeight);
            }
        }
    });

    // Create deficit area with clipping
    g.append("path")
        .datum(filteredFiscalData)
        .attr("class", "deficit-intersecting-area")
        .attr("d", areaGenerator)
        .attr("fill", "url(#deficitHatch)")
        .attr("clip-path", "url(#deficitClip)")
        .style("opacity", 0.7)
        .style("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .style("opacity", .9)
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        });    // Add legend FIRST, before lines
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(0, ${height + 50})`);
    
    // Define legend data
    const legendData = [
        { type: 'line', color: '#4ECDC4', label: 'Operating Revenue' },
        { type: 'line', color: '#FF6B6B', label: 'Total Expenditure' },
        { type: 'line', color: '#8B5CF6', label: 'Foreign Reserves' },
        { type: 'rect', pattern: 'url(#surplusHatch)', color: '#4ECDC4', label: 'Surplus' },
        { type: 'rect', pattern: 'url(#deficitHatch)', color: '#FF6B6B', label: 'Deficit' }
    ];

    const legendItems = legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item');

    // Add lines for line types
    legendItems.filter(d => d.type === 'line')
        .append('line')
        .attr('x1', 0)
        .attr('x2', 20)
        .attr('y1', 0)
        .attr('y2', 0)
        .attr('stroke', d => d.color)
        .attr('stroke-width', 3);

    // Add rectangles for pattern types
    legendItems.filter(d => d.type === 'rect')
        .append('rect')
        .attr('x', 0)
        .attr('y', -8)
        .attr('width', 15)
        .attr('height', 15)
        .style('fill', d => d.pattern)
        .style('stroke', d => d.color)
        .style('stroke-width', 1);

    // Add text labels
    legendItems.append('text')
        .attr('x', 25)
        .attr('y', 0)
        .attr('dy', '0.35em')
        .style('font-family', "'Inter', sans-serif")
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#666')
        .text(d => d.label);

    // Position legend items with proper spacing
    let currentX = 0;
    legendItems.each(function(d, i) {
        d3.select(this).attr('transform', `translate(${currentX}, 0)`);
        
        // Calculate width of this item (icon + text + gap)
        const textElement = d3.select(this).select('text').node();
        const textWidth = textElement.getBBox().width;
        const iconWidth = 25; // icon + gap to text
        const itemWidth = iconWidth + textWidth;
        
        currentX += itemWidth + 60; // 60px gap between items
    });

    // Center the entire legend
    const totalWidth = currentX - 60; // subtract last gap
    legend.attr('transform', `translate(${-totalWidth/2 + width/2}, ${height + 50})`);

    // Create a group specifically for lines - ADD THIS LAST TO BE ON TOP
    const linesGroup = g.append("g").attr("class", "lines-group");
    
    // Add revenue line
    linesGroup.append("path")
        .datum(filteredFiscalData)
        .attr("class", "revenue-line")
        .attr("fill", "none")
        .attr("stroke", "#4ECDC4")
        .attr("stroke-width", 3)
        .attr("d", revenueLine)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            // Create an overlay line that's absolutely positioned above everything
            const rect = d3.select("#fiscalChart").node().getBoundingClientRect();
            const svg = d3.select("#fiscalChart svg");
            
            // Remove any existing hover overlay
            d3.select("body").selectAll(".fiscal-hover-overlay").remove();
            
            // Create overlay div
            const overlay = d3.select("body")
                .append("div")
                .attr("class", "fiscal-hover-overlay")
                .style("position", "absolute")
                .style("top", rect.top + "px")
                .style("left", rect.left + "px")
                .style("width", rect.width + "px")
                .style("height", rect.height + "px")
                .style("pointer-events", "none")
                .style("z-index", "99999");
            
            // Create SVG in overlay
            const overlaySvg = overlay.append("svg")
                .attr("width", rect.width)
                .attr("height", rect.height);
            
            const overlayG = overlaySvg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);
            
            // Draw the enhanced line in overlay
            overlayG.append("path")
                .datum(filteredFiscalData)
                .attr("fill", "none")
                .attr("stroke", "#4ECDC4")
                .attr("stroke-width", 10)
                .attr("d", revenueLine)
                .style("filter", "drop-shadow(0px 0px 8px rgba(78, 205, 196, 1))");
            
            // Show line label
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`<strong>Operating Revenue</strong><br/>Hover along the line to see values`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                d3.select("#tooltip")
                    .html(`<strong>Operating Revenue ${dataPoint.year}</strong><br/>S$${dataPoint.revenue.toFixed(1)} billion`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
                .on("mouseout", function() {
                    d3.select("#tooltip").style("opacity", 0);
                    // Reset line appearance
                    d3.select(this)
                        .attr("stroke-width", 3)
                        .style("filter", "none")
                        .classed("revenue-line-hover", false);
                });    // Add expenditure line
    linesGroup.append("path")
        .datum(filteredFiscalData)
        .attr("class", "expenditure-line")
        .attr("fill", "none")
        .attr("stroke", "#FF6B6B")
        .attr("stroke-width", 3)
        .attr("d", expenditureLine)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            // Move this element to be the last child (renders on top)
            this.parentNode.appendChild(this);
            
            // Simple approach: just make this line thicker and add glow
            d3.select(this)
                .attr("stroke-width", 5)
                .style("filter", "drop-shadow(0px 0px 6px rgba(255, 107, 107, 1))")
                .classed("expenditure-line-hover", true);
            
            // Show line label
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`<strong>Total Expenditure</strong><br/>Hover along the line to see values`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                d3.select("#tooltip")
                    .html(`<strong>Total Expenditure ${dataPoint.year}</strong><br/>S$${dataPoint.expenditure.toFixed(1)} billion`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
            // Reset line appearance
            d3.select(this)
                .attr("stroke-width", 3)
                .style("filter", "none")
                .classed("expenditure-line-hover", false);
        });
        
    // Add foreign reserves line
    linesGroup.append("path")
        .datum(filteredReservesData)
        .attr("class", "reserves-line")
        .attr("fill", "none")
        .attr("stroke", "#8B5CF6")
        .attr("stroke-width", 3)
        .attr("d", reservesLine)
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            // Move this element to be the last child (renders on top)
            this.parentNode.appendChild(this);
            
            // Simple approach: just make this line thicker and add glow
            d3.select(this)
                .attr("stroke-width", 5)
                .style("filter", "drop-shadow(0px 0px 6px rgba(139, 92, 246, 1))")
                .classed("reserves-line-hover", true);
            
            // Show line label
            d3.select("#tooltip")
                .style("opacity", 1)
                .html(`<strong>Foreign Reserves</strong><br/>Hover along the line to see values`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredReservesData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                d3.select("#tooltip")
                    .html(`<strong>Foreign Reserves ${dataPoint.year}</strong><br/>S$${dataPoint.value.toFixed(1)} billion`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
            // Reset line appearance
            d3.select(this)
                .attr("stroke-width", 3)
                .style("filter", "none")
                .classed("reserves-line-hover", false);
        });
}

function updateFiscalChart() {
    if (!fiscalData || fiscalData.length === 0) return;
    
    const svg = d3.select("#fiscalChart svg");
    if (svg.empty()) return;
    
    const margin = { top: 20, right: 80, bottom: 15, left: 80 };
    const containerWidth = document.getElementById('fiscalChart').clientWidth;
    const width = containerWidth - margin.left - margin.right;
    const height = 350 - margin.top - margin.bottom;
    const g = svg.select("g");
    
    // Filter data up to current year
    const filteredFiscalData = fiscalData.filter(d => d.year <= currentYear);
    const filteredReservesData = reservesData.filter(d => d.year <= currentYear);
    
    // Update scales - separate scales for fiscal and reserves data
    const maxFiscal = d3.max(filteredFiscalData, d => Math.max(d.revenue, d.expenditure));
    const maxReserves = d3.max(filteredReservesData, d => d.value);
    
    const xScale = d3.scaleLinear()
        .domain(d3.extent(filteredFiscalData, d => d.year))
        .range([0, width]);
    
    // Left y-axis for fiscal data (revenue & expenditure)
    const yScale = d3.scaleLinear()
        .domain([0, maxFiscal])
        .range([height, 0]);
    
    // Right y-axis for reserves data
    const yScaleReserves = d3.scaleLinear()
        .domain([0, maxReserves])
        .range([height, 0]);
    
    // Line generators
    const revenueLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.revenue))
        .curve(d3.curveMonotoneX);
    
    const expenditureLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScale(d.expenditure))
        .curve(d3.curveMonotoneX);
    
    const reservesLine = d3.line()
        .x(d => xScale(d.year))
        .y(d => yScaleReserves(d.value))
        .curve(d3.curveMonotoneX);
    
    // Update axes
    const uniqueYears = [...new Set(filteredFiscalData.map(d => d.year))].sort((a, b) => a - b);
    const filteredYears = uniqueYears.filter(year => year !== 1997 && year !== 2025);
    const every2Years = filteredYears.filter((year, index) => (year - 1998) % 2 === 0);
    
    g.select(".x-axis")
        .transition()
        .duration(800)
        .call(d3.axisBottom(xScale).tickFormat(d3.format("d")).tickValues(every2Years))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    g.select(".y-axis")
        .transition()
        .duration(800)
        .call(d3.axisLeft(yScale).tickFormat(d => d + "B").ticks(5))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Update right y-axis for reserves
    g.select(".y-axis-right")
        .transition()
        .duration(800)
        .call(d3.axisRight(yScaleReserves).tickFormat(d => d + "B").ticks(5))
        .selectAll("text")
        .style("font-family", "'Inter', sans-serif")
        .style("font-size", "12px");
    
    // Update lines
    g.select(".lines-group .revenue-line")
        .datum(filteredFiscalData)
        .transition()
        .duration(800)
        .attr("d", revenueLine)
        .on("end", function() {
            // Reapply hover events after transition
            d3.select(this)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    // Move this element to be the last child (renders on top)
                    this.parentNode.appendChild(this);
                    
                    // Simple approach: just make this line thicker and add glow
                    d3.select(this)
                        .attr("stroke-width", 5)
                        .style("filter", "drop-shadow(0px 0px 6px rgba(78, 205, 196, 1))")
                        .classed("revenue-line-hover", true);
                    
                    d3.select("#tooltip")
                        .style("opacity", .9)
                        .html(`<strong>Operating Revenue</strong><br/>Hover along the line to see values`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mousemove", function(event) {
                    const [mouseX] = d3.pointer(event, this);
                    const hoveredYear = Math.round(xScale.invert(mouseX));
                    const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
                    
                    if (dataPoint) {
                        d3.select("#tooltip")
                            .html(`<strong>Operating Revenue</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${dataPoint.revenue.toFixed(1)}B`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    // Reset line appearance
                    d3.select(this)
                        .attr("stroke-width", 3)
                        .style("filter", "none")
                        .classed("revenue-line-hover", false);
                    d3.select("#tooltip").style("opacity", 0);
                });
        });
    
    g.select(".lines-group .expenditure-line")
        .datum(filteredFiscalData)
        .transition()
        .duration(800)
        .attr("d", expenditureLine)
        .on("end", function() {
            // Reapply hover events after transition
            d3.select(this)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    // Move this element to be the last child (renders on top)
                    this.parentNode.appendChild(this);
                    
                    // Simple approach: just make this line thicker and add glow
                    d3.select(this)
                        .attr("stroke-width", 5)
                        .style("filter", "drop-shadow(0px 0px 6px rgba(255, 107, 107, 1))")
                        .classed("expenditure-line-hover", true);
                    
                    d3.select("#tooltip")
                        .style("opacity", .9)
                        .html(`<strong>Total Expenditure</strong><br/>Hover along the line to see values`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mousemove", function(event) {
                    const [mouseX] = d3.pointer(event, this);
                    const hoveredYear = Math.round(xScale.invert(mouseX));
                    const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
                    
                    if (dataPoint) {
                        d3.select("#tooltip")
                            .html(`<strong>Total Expenditure</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${dataPoint.expenditure.toFixed(1)}B`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    // Reset line appearance
                    d3.select(this)
                        .attr("stroke-width", 3)
                        .style("filter", "none")
                        .classed("expenditure-line-hover", false);
                    d3.select("#tooltip").style("opacity", 0);
                });
        });
    
    // Update reserves line
    g.select(".lines-group .reserves-line")
        .datum(filteredReservesData)
        .transition()
        .duration(800)
        .attr("d", reservesLine)
        .on("end", function() {
            // Reapply hover events after transition
            d3.select(this)
                .style("cursor", "pointer")
                .on("mouseover", function(event) {
                    // Move this element to be the last child (renders on top)
                    this.parentNode.appendChild(this);
                    
                    // Simple approach: just make this line thicker and add glow
                    d3.select(this)
                        .attr("stroke-width", 5)
                        .style("filter", "drop-shadow(0px 0px 6px rgba(139, 92, 246, 1))")
                        .classed("reserves-line-hover", true);
                    
                    d3.select("#tooltip")
                        .style("opacity", .9)
                        .html(`<strong>Foreign Reserves</strong><br/>Hover along the line to see values`)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mousemove", function(event) {
                    const [mouseX] = d3.pointer(event, this);
                    const hoveredYear = Math.round(xScale.invert(mouseX));
                    const dataPoint = filteredReservesData.find(d => d.year === hoveredYear);
                    
                    if (dataPoint) {
                        d3.select("#tooltip")
                            .html(`<strong>Foreign Reserves</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${dataPoint.value.toFixed(1)}B`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 10) + "px");
                    }
                })
                .on("mouseout", function() {
                    // Reset line appearance
                    d3.select(this)
                        .attr("stroke-width", 3)
                        .style("filter", "none")
                        .classed("reserves-line-hover", false);
                    d3.select("#tooltip").style("opacity", 0);
                });
        });
    
    // Update intersecting area with color-coded segments
    const areaGenerator = d3.area()
        .x(d => xScale(d.year))
        .y0(d => yScale(Math.min(d.revenue, d.expenditure)))
        .y1(d => yScale(Math.max(d.revenue, d.expenditure)))
        .curve(d3.curveMonotoneX);
    
    // Remove old areas and clip paths
    g.selectAll("[class^='intersecting-area']").remove();
    g.selectAll("[class^='deficit-intersecting-area']").remove();
    d3.select("#surplusClip").remove();
    d3.select("#deficitClip").remove();
    
    // Recreate the area generator for the current filtered data
    const areaGen = d3.area()
        .x(d => xScale(d.year))
        .y0(d => yScale(Math.min(d.revenue, d.expenditure)))
        .y1(d => yScale(Math.max(d.revenue, d.expenditure)))
        .curve(d3.curveMonotoneX);

    // Create a single continuous area with pattern masks
    const intersectionPath = g.append("path")
        .datum(filteredFiscalData)
        .attr("class", "intersecting-area")
        .attr("d", areaGen)
        .attr("fill", "url(#surplusHatch)")
        .style("opacity", 0.7)
        .style("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .style("opacity", .9)
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        });

    // Get the defs element (should already exist)
    const defs = svg.select("defs");

    // Create clipPaths for surplus and deficit regions
    const clipSurplus = defs.append("clipPath")
        .attr("id", "surplusClip");
    
    const clipDeficit = defs.append("clipPath")
        .attr("id", "deficitClip");

    // Build the clip paths based on surplus/deficit status for current filtered data
    filteredFiscalData.forEach((d, i) => {
        if (i < filteredFiscalData.length - 1) {
            const nextD = filteredFiscalData[i + 1];
            const surplus = d.revenue - d.expenditure;
            const isSurplus = surplus > 0;
            
            // Create rectangles for clipping
            const rectX = xScale(d.year);
            const rectWidth = xScale(nextD.year) - xScale(d.year);
            const rectY = 0;
            const rectHeight = height;
            
            if (isSurplus) {
                clipSurplus.append("rect")
                    .attr("x", rectX)
                    .attr("y", rectY)
                    .attr("width", rectWidth)
                    .attr("height", rectHeight);
            } else {
                clipDeficit.append("rect")
                    .attr("x", rectX)
                    .attr("y", rectY)
                    .attr("width", rectWidth)
                    .attr("height", rectHeight);
            }
        }
    });

    // Create deficit area with clipping
    g.append("path")
        .datum(filteredFiscalData)
        .attr("class", "deficit-intersecting-area")
        .attr("d", areaGen)
        .attr("fill", "url(#deficitHatch)")
        .attr("clip-path", "url(#deficitClip)")
        .style("opacity", 0.7)
        .style("pointer-events", "all")
        .style("cursor", "pointer")
        .on("mouseover", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .style("opacity", .9)
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mousemove", function(event) {
            const [mouseX] = d3.pointer(event, this);
            const hoveredYear = Math.round(xScale.invert(mouseX));
            const dataPoint = filteredFiscalData.find(d => d.year === hoveredYear);
            
            if (dataPoint) {
                const surplus = dataPoint.revenue - dataPoint.expenditure;
                const isSurplus = surplus > 0;
                const status = isSurplus ? "Surplus" : "Deficit";
                const statusColor = isSurplus ? "#4ECDC4" : "#FF6B6B";
                
                d3.select("#tooltip")
                    .html(`<strong style="color: ${statusColor}">${status}</strong><br/>Year: ${dataPoint.year}<br/>Amount: S$${Math.abs(surplus).toFixed(1)}B`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            }
        })
        .on("mouseout", function() {
            d3.select("#tooltip").style("opacity", 0);
        });
    
    // Update lines
    g.select(".revenue-line")
        .datum(filteredFiscalData)
        .attr("d", revenueLine);
    
    g.select(".expenditure-line")
        .datum(filteredFiscalData)
        .attr("d", expenditureLine);
}

// Note: loadFiscalData() is now called from within loadData() to ensure proper timing
