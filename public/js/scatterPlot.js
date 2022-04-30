class ScatterPlot{

    constructor() {

    }

    update() {
        this.changed = true
        this.setScatterPlot()
    }

    async setScatterPlot() {
        setActiveChart('scatterplot')
        hideAllPanels()

        d3.select('#vis-loading').style('display', 'block')

        clearGraphView()
        clearChordDiagram()

        const graphContainer = d3.select('div.viewContainer');
        this.width = graphContainer.node().clientWidth
        this.height = graphContainer.node().clientHeight
        this.margin = {left: 100, top: 250, bottom: this.height - 75, right: this.width - 100};

        const y_scale = d3.scaleLinear()
            .domain([configPanel.extent.conf.min, configPanel.extent.conf.max])
            .range([this.margin.bottom, this.margin.top])

        const x_scale = d3.scaleLinear()
            .domain([configPanel.extent.int.min, configPanel.extent.int.max])
            .range([this.margin.left, this.margin.right])

        const y = d3.axisLeft(y_scale),
            x = d3.axisBottom(x_scale);

        // const countComb = {};

        // const filteredData = getFilteredData()
        if (!this.data || this.changed || !this.data.length) {
            let result = await this.fetchData()
            this.count = result.count
            this.data = result.data
            this.changed = false
        } else if (!this.changed) {
            d3.select('svg#scatter-plot').style('display', 'block')
            return
        }

        if (!this.data || !this.data.length) {
            this.plotGroup.select('g#rects').style('display', 'none')
            this.plotGroup.select('#welcome-text')
                .style('display', 'block')
                .text('There is no data to show. Try modifying the filters.')
            return;
        }

        let values = Object.values(this.count);
        values.sort((a,b) => a - b)

        this.rectSides = [10, 20, 40, 60, 80, 100]
        this.countBreaks = ss.jenks(values, 5);
        this.sideScale = d3.scaleThreshold()
            .domain(this.countBreaks.slice(1, 5))
            .range(this.rectSides.map(d => d * .7))

        this.plotGroup = graphContainer.select('svg#scatter-plot')
        let rectGroup; //legendGroup;
        if (this.plotGroup.empty()) {
            this.plotGroup = graphContainer.append('svg')
                .attr('id', 'scatter-plot')
                .attrs({
                    'width': '100%',
                    'height': '100%'
                })

            const yAxis = this.plotGroup.append("g")

            yAxis.append('g')
                .attr("transform", `translate(${this.margin.left - 40}, 0)`)
                .call(y);
            
            yAxis.append('text')
                .text('Confidence')
                .style('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .attr('transform', `translate(20, ${(this.margin.bottom + this.margin.top) / 2})rotate(-90)`)
        
            const xAxis = this.plotGroup.append('g')

            xAxis.append('g')
                .attr('transform', `translate(0, ${this.margin.bottom + 30})`)
                .call(x)
            
            xAxis.append('text')
                .text('Interestingness')
                .style('text-anchor', 'middle')
                .style('font-weight', 'bold')
                .attr('transform', `translate(${(this.margin.left + this.margin.right) / 2}, ${this.margin.bottom + 70})`)

            this.plotGroup.append('text')
                .attr('id', 'welcome-text')
                .attrs({
                    'x': '50%',
                    'y': '10%'
                })
                .styles({
                    'display': 'none',
                    'text-anchor': 'middle',
                    'fill': 'red'
                })

            rectGroup = this.plotGroup.append('g').attr('id', 'rects')

            this.setLegend()
        } else {
            this.plotGroup.style('display', 'block')
            rectGroup = this.plotGroup.select('g#rects')
            this.plotGroup.select('g#rects').style('display', 'block')
            this.plotGroup.select('#welcome-text')
                .style('display', 'none')
            // legendGroup = plotGroup.select('g#scatter-legend')
        }

        
        rectGroup.selectAll('rect')
            .data(this.data)
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
                const rectSide = this.sideScale(this.count[key])
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
                let color = configPanel.getColor(d)
                return {
                    'fill': d.isSymmetric ? "url('#"+ color + "-pattern')" : color,
                    'stroke': d3.rgb(d.fill).darker()
                }
            })
            .on('mouseenter', d => {
                const key = d.confidence+'-'+d.interestingness+'-'+d.isSymmetric;
                const rectSide = this.sideScale(this.count[key])
                let html = this.count[key] + ' rules<br><br>' + 
                    'Confidence: ' + d.confidence + 
                    '<br>Interestingness: ' + d.interestingness + 
                    '<br>Symmetric: ' + d.isSymmetric;
                displayTooltip(html)
            })
            .on('mouseleave', d => {
                hideTooltip()
            })
            .on('contextmenu', d3.contextMenu(scatterPlotMenu))

        this.plotGroup.selectAll('line.helper').raise()
        d3.select('#vis-loading').style('display', 'none')
    }

    //-----------------------------------
    // legend
    setLegend(){
        let legendGroup = this.plotGroup.append('g').attr('id', 'scatter-legend')
    
        legendGroup.append('text')
            .attrs({
                'x': this.margin.left,
                'y': 20
            })
            .style('font-weight', 'bold')
            .text('Number of Rules')
    
        legendGroup.attr('transform', `translate(${this.margin.right - 450}, 30)`)
    
    
        legendGroup.selectAll('rect')
            .data(this.rectSides.slice(0, 5))
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
                const prevSides = d3.sum(this.rectSides.slice(0, i).map(d => Math.sqrt(Math.pow(d, 2) * 2) + 30));
                return{
                    'width': d,
                    'height': d,
                    'transform': `translate(${this.margin.left + prevSides + d/2}, ${55 - Math.sqrt(Math.pow(d, 2) * 2)/2})rotate(45)`
                }
            })
        
        // add values
        legendGroup.selectAll('text.values')
            .data(this.countBreaks.slice(0,5))
            .join(
                enter => enter.append('text')
                    .classed('values', true)
                    .styles({
                        'text-anchor': 'middle'
                    }),
                update => update,
                exit => exit.remove()
            )
            .text((d,i) => '[' + d + ', ' + this.countBreaks[i+1] + (i == 4 ? ']' : ')'))
            .attrs((d,i) => {
                const thisSide = this.sideScale(d);
                const prevSides = d3.sum(this.rectSides.slice(0, i).map(d => Math.sqrt(Math.pow(d, 2) * 2) + 30));
                return {
                    'x': this.margin.left + prevSides + thisSide/2,
                    // 'y': 85 + Math.sqrt(Math.pow(d, 2) * 2) 
                    'y': 125
                }
            })
    }

    async  fetchData() {
        let url = '/arviz/' + appli + '/data/scatterplot'
        let response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( {
                filtering: configPanel.filtering,
                uncheck_methods: configPanel.getMethods(),
                langs: configPanel.getLanguages()
            } )
        })
        return response.json()
    }
}



// setScatterPlot()