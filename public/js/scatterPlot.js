function setScatterPlot(){

    setActiveChart('scatterplot')
    hideAllPanels()

    clearGraphView()
    clearChordDiagram()

    const graphContainer = d3.select('div.viewContainer'),
        width = graphContainer.node().clientWidth,
        height = graphContainer.node().clientHeight,
        margin = {left: 100, top: 250, bottom: height - 75, right: width - 100};

    const y_scale = d3.scaleLinear()
        .domain([legend.extent.conf.min, legend.extent.conf.max])
        .range([margin.bottom, margin.top])

    const x_scale = d3.scaleLinear()
        .domain([legend.extent.int.min, legend.extent.int.max])
        .range([margin.left, margin.right])

    const y = d3.axisLeft(y_scale),
        x = d3.axisBottom(x_scale);

    const countComb = {};

    const filteredData = getFilteredData()
    filteredData.forEach(d => {
        const key = d.confidence+'-'+d.interestingness+'-'+d.isSymmetric;
        if (countComb[key]) {
            countComb[key] ++;
        } else countComb[key] = 1;
    })

    filteredData.sort((a,b) => {
        const keyA = a.confidence+'-'+a.interestingness+'-'+a.isSymmetric,
            keyB = b.confidence+'-'+b.interestingness+'-'+b.isSymmetric;
        return countComb[keyB] - countComb[keyA]
    })

    let values = Object.values(countComb);
    // values = values.filter((d,i) => values.indexOf(d) == i)
    values.sort((a,b) => a - b)

    const rectSides = [10, 20, 40, 60, 80, 100]
    const countBreaks = ss.jenks(values, 5);
    const sideScale = d3.scaleThreshold()
        .domain(countBreaks.slice(1, 5))
        .range(rectSides)

    let plotGroup = graphContainer.select('svg#scatter-plot')
    let rectGroup; //legendGroup;
    if (plotGroup.empty()) {
        plotGroup = graphContainer.append('svg')
            .attr('id', 'scatter-plot')
            .attrs({
                'width': '100%',
                'height': '100%'
            })

        const yAxis = plotGroup.append("g")

        yAxis.append('g')
            .attr("transform", `translate(${margin.left - 40}, 0)`)
            .call(y);
        
        yAxis.append('text')
            .text('Confidence')
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .attr('transform', `translate(20, ${(margin.bottom + margin.top) / 2})rotate(-90)`)
    
        const xAxis = plotGroup.append('g')

        xAxis.append('g')
            .attr('transform', `translate(0, ${margin.bottom + 30})`)
            .call(x)
        
        xAxis.append('text')
            .text('Interestingness')
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .attr('transform', `translate(${(margin.left + margin.right) / 2}, ${margin.bottom + 70})`)


        rectGroup = plotGroup.append('g').attr('id', 'rects')

        setLegend()
    } else {
        plotGroup.style('display', 'block')
        rectGroup = plotGroup.select('g#rects')
        // legendGroup = plotGroup.select('g#scatter-legend')
    }

    
    rectGroup.selectAll('rect')
        .data(filteredData)
        .join(
            enter => enter.append('rect')
                .styles({
                    'cursor': 'pointer',
                    'stroke-width': '1px',
                    'opacity': '0.9'
                }),
            update => update,
            exit => exit.remove()
        )
        .attrs(d => {
            const key = d.confidence+'-'+d.interestingness+'-'+d.isSymmetric;
            const rectSide = sideScale(countComb[key])
            const x = x_scale(d.interestingness),
                y = y_scale(d.confidence) - Math.sqrt(Math.pow(rectSide, 2) * 2)/2;
            return{
                'width': rectSide,
                'height': rectSide,
                //'transform': `translate(${d.isSymmetric ? x - 20 : x} , ${d.isSymmetric ? y - 10 : y})rotate(45)`
                'transform': `translate(${x} , ${y})rotate(45)`
            }
        })
        .styles(d => {
            return {
                'fill': d.isSymmetric ? "url('#"+ d.fill + "-pattern')" : d.fill,
                'stroke': d3.rgb(d.fill).darker()
            }
        })
        .on('mouseenter', d => {
            const key = d.confidence+'-'+d.interestingness+'-'+d.isSymmetric;
            const rectSide = sideScale(countComb[key])
            let html = countComb[key] + ' rules<br><br>' + 
                'Confidence: ' + d.confidence + 
                '<br>Interestingness: ' + d.interestingness + 
                '<br>Symmetric: ' + d.isSymmetric;
            displayTooltip(html)
        })
        .on('mouseleave', d => {
            hideTooltip()
        })
        .on('contextmenu', d3.contextMenu(scatterPlotMenu))

    plotGroup.selectAll('line.helper').raise()
    
      //-----------------------------------
    // legend
    function setLegend(){
        let legendGroup = plotGroup.append('g').attr('id', 'scatter-legend')
    
        legendGroup.append('text')
            .attrs({
                'x': margin.left,
                'y': 20
            })
            .style('font-weight', 'bold')
            .text('Number of Rules')
    
        legendGroup.attr('transform', `translate(${margin.right - 450}, 30)`)
    
    
        legendGroup.selectAll('rect')
            .data(rectSides.slice(0, 5))
            .join(
                enter => enter.append('rect')
                    .styles({
                        'stroke': '#000',
                        'stroke-width': '1px',
                        'fill': '#fff'
                    }),
                update => update,
                exit => exit.remove()
            )
            .attrs((d,i) => {
                const prevSides = d3.sum(rectSides.slice(0, i).map(d => Math.sqrt(Math.pow(d, 2) * 2) + 30));
                return{
                    'width': d,
                    'height': d,
                    'transform': `translate(${margin.left + prevSides + d/2}, ${55 - Math.sqrt(Math.pow(d, 2) * 2)/2})rotate(45)`
                }
            })
        
        // add values
        legendGroup.selectAll('text.values')
            .data(countBreaks.slice(0,5))
            .join(
                enter => enter.append('text')
                    .classed('values', true)
                    .styles({
                        'text-anchor': 'middle'
                    }),
                update => update,
                exit => exit.remove()
            )
            .text((d,i) => '[' + d + ', ' + countBreaks[i+1] + (i == 4 ? ']' : ')'))
            .attrs((d,i) => {
                const thisSide = sideScale(d);
                const prevSides = d3.sum(rectSides.slice(0, i).map(d => Math.sqrt(Math.pow(d, 2) * 2) + 30));
                return {
                    'x': margin.left + prevSides + thisSide/2,
                    // 'y': 85 + Math.sqrt(Math.pow(d, 2) * 2) 
                    'y': 125
                }
            })
    }
        
}



// setScatterPlot()