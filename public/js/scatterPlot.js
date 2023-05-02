class ScatterPlot extends Chart{

    constructor(config) {
        super(config)
        this.id = 'scatterplot'

        this.rectSides = [10, 20, 40, 60, 80, 100]
    }

    update() {
        this.changed = true
        this.set()
    }

    hide() {
        d3.select(this.dashboard.shadowRoot.querySelector('svg#scatter-plot')).style('display', 'none')
    }

    display() {
        d3.select(this.dashboard.shadowRoot.querySelector('svg#scatter-plot')).style('display', 'block')
        this.dashboard.hideLoading()
    }

    init() {
    
        this.svg = this.div.append('svg')
            .attr('id', 'scatter-plot')
            .attrs({
                'width': '100%',
                'height': '100%'
            })

        this.setAxes()
        this.setLegend()

        this.svg.append('text')
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

        this.rectGroup = this.svg.append('g').attr('id', 'rects')

        this.hide()
    }

    setLegend() {
        this.legendGroup = this.svg.append('g').attr('id', 'scatter-legend')

        this.legendGroup.append('text')
            .attrs({
                'x': this.margin.left,
                'y': 20
            })
            .style('font-weight', 'bold')
            .text('Number of Rules')
    
        this.legendGroup.attr('transform', `translate(${this.margin.right - 450}, 30)`)
    }

    setAxes() {

        this.filter = this.dashboard.filter.getFilteringCriteria()

        this.yScale = d3.scaleLinear()
            .domain([this.filter.conf.min_sel, this.filter.conf.max_sel])
            .range([this.margin.bottom, this.margin.top])

        this.xScale = d3.scaleLinear()
            .domain([this.filter.int.min_sel, this.filter.int.max_sel])
            .range([this.margin.left, this.margin.right])

        const y = d3.axisLeft(this.yScale),
            x = d3.axisBottom(this.xScale);

        const yAxis = this.svg.append("g")

        yAxis.append('g')
            .attr("transform", `translate(${this.margin.left - 40}, 0)`)
            .call(y);
        
        yAxis.append('text')
            .text('Confidence')
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .attr('transform', `translate(20, ${(this.margin.bottom + this.margin.top) / 2})rotate(-90)`)
    
        const xAxis = this.svg.append('g')

        xAxis.append('g')
            .attr('transform', `translate(0, ${this.margin.bottom + 30})`)
            .call(x)
        
        xAxis.append('text')
            .text('Interestingness')
            .style('text-anchor', 'middle')
            .style('font-weight', 'bold')
            .attr('transform', `translate(${(this.margin.left + this.margin.right) / 2}, ${this.margin.bottom + 70})`)
            
    }

    async set() {
        
        if (!this.changed)
            this.dashboard.showLoading()

        this.dashboard.chord.hide()
        this.dashboard.graph.hide()

        if (!this.data || this.changed || !this.data.length) {
            this.filter = this.dashboard.filter.getFilteringCriteria()

            let result = await this.fetchData()
            this.count = result.count
            this.data = result.data
            this.changed = false

            this.yScale.domain([this.filter.conf.min_sel, this.filter.conf.max_sel])

            this.xScale.domain([this.filter.int.min_sel, this.filter.int.max_sel])

        } else if (!this.changed) {
            this.display()
            return
        }

        if (!this.data || !this.data.length) {
            this.svg.select('g#rects').style('display', 'none')
            this.svg.select('#welcome-text')
                .style('display', 'block')
                .text('There is no data to show. Try modifying the filters.')
            return;
        }

        this.display()

        let values = Object.values(this.count);
        values.sort((a,b) => a - b)
        
        this.countBreaks = ss.jenks(values, 5);
        this.sideScale = d3.scaleThreshold()
            .domain(this.countBreaks.slice(1, 5))
            .range(this.rectSides.map(d => d * .7))

        this.svg = this.div.select('svg#scatter-plot')
       
        this.svg.style('display', 'block')
        this.rectGroup = this.svg.select('g#rects')
        this.svg.select('g#rects').style('display', 'block')
        this.svg.select('#welcome-text').style('display', 'none')
        
        this.rectGroup.selectAll('rect')
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
                const x = this.xScale(d.interestingness),
                    y = this.yScale(d.confidence) - Math.sqrt(Math.pow(rectSide, 2) * 2)/2;
                return{
                    'width': rectSide,
                    'height': rectSide,
                    //'transform': `translate(${d.isSymmetric ? x - 20 : x} , ${d.isSymmetric ? y - 10 : y})rotate(45)`
                    'transform': `translate(${x} , ${y})rotate(45)`
                }
            })
            .styles(d => {
                let color = this.dashboard.legend.getColor(d)
                return {
                    'fill': d.isSymmetric ? this.getPatternUrl(color) : color,
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
                this.displayTooltip(html)
            })
            .on('mouseleave', d => {
                this.hideTooltip()
            })
            .on('contextmenu', d3.contextMenu(scatterPlotMenu))

        this.svg.selectAll('line.helper').raise()

        this.updateLegend()
    }

    //-----------------------------------
    // legend
    updateLegend(){
        
        this.legendGroup.selectAll('rect')
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
        this.legendGroup.selectAll('text.values')
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
        let url = '/arviz/' + this.dashboard.getAttribute("app") + '/data/' + this.id
        let response = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify( {
                filtering: this.dashboard.filter.getFilteringCriteria(),
                uncheck_methods: this.dashboard.filter.getMethods(),
                langs: this.dashboard.filter.getLanguages()
            } )
        })
        return response.json()
    }
}



// setScatterPlot()