class Legend extends ConfigPanel {
    constructor(config) {
        super(config)
    
        this.intScale = null
        this.confScale = null
        this.bivariateColorScale = null

        
    }

    init(){

        this.confScale = d3.scaleThreshold()
            .domain([this.config.min_confidence, d3.mean([this.config.min_confidence, 1]), 1])
            .range(['low', 'medium', 'high'])

        this.intScale = d3.scaleThreshold()
            .domain([this.config.min_interestingness, d3.mean([this.config.min_interestingness, 1]), 1])
            .range(['low', 'medium', 'high'])

        this.colors = [ "#ccc", "#b2dede", "#5ac8c8",
            "#dfb0d6", "#a5add3", "#5698b9", 
            "#be64ac", "#8c62aa", "#3b4994"].reverse()

        this.values = ['high high', 'high medium', 'high low',
            'medium high', 'medium medium', 'medium low',
            'low high', 'low medium', 'low low']

        this.bivariateColorScale = d3.scaleOrdinal()
            .domain(this.values)
            .range(this.colors)

        this.set()
        
    }    

     set() {

        this.div = d3.select(this.dashboard.shadowRoot.querySelector('div#legend'))
            .styles({
                'width': this.width + 'px',
                'height': this.height + 'px',
                'overflow': 'hidden'
            });
        
        this.setTitleBar()

        this.svg = this.div.append('svg')
            .attrs({
                'width': '100%',
                'height': '100%',
                'id': 'legend-container',
                'transform': 'translate(20,20)'
            })
            .styles({
                'position': 'relative',
                'text-align': 'center'
            })

        // this.setCloseButton(this.svg, this.width - 20)
        
        this.setDefs()
        this.drawColorLegend()
        this.drawSymmetryLegend()

        this.div.style('width', '0')
    }

    setDefs() {
        //-------------------------------------------------------------
        // pattern fill (for symmetry)
        const defs = d3.select(this.dashboard.shadowRoot.querySelector('div#legend'))
            .append('svg')
            .attr('width', '100%')
            .append("defs");

        this.colors.push("#000") // pattern for legend

        const patternSize = 7;
        const pattern = defs.selectAll('pattern')
            .data(this.colors)
            .enter()
            .append("pattern")
                .attr('patternUnits', 'userSpaceOnUse')
                .attr("id", fill => `${fill}-pattern`)
                .attr("height", patternSize)
                .attr("width", patternSize)
                
        pattern.append('rect')
            .attr('width', patternSize)
            .attr('height', patternSize)
            .style('fill', d => d)

        pattern.append('circle')
            .attrs({
                'cx': 3,
                'cy': 3,
                'r': 2,
                'fill': 'white'
            })


        this.svg.append('defs')
            .append('marker')
            .attrs({
                'id': 'arrow',
                'markerWidth': 10,
                'markerHeight': 10,
                'refX': 0,
                'refY': 3,
                'orient': "auto",
                'markerUnits':"strokeWidth",
                'viewBox':"0 0 20 20"
            })
            .append('path')
            .attr('d', 'M0,0 L0,6 L9,3 z')
            .style('fill', '#000')
    }

    //----------------------------------------------------------
    // set legend panel
    drawColorLegend(){

        let legendwidth = 80;

        const rectWidth = legendwidth / 3;
        let top = 10,
            left = legendwidth;

        const legendSvg = this.svg.append('g')
            .attr('id', 'legend-confint')

        const rects = legendSvg.selectAll('rect')
            .data(this.values)
            .enter()
                .append('rect')
                .attrs((d,i) => {
                    return {
                        'x': rectWidth * Math.floor(i / 3),
                        'y': rectWidth * (i % 3),
                        'width': rectWidth,
                        'height': rectWidth
                    }
                })
                .styles(d => {
                    const fill = this.bivariateColorScale(d);
                    return {
                        'fill': fill, 
                        'stroke': d3.rgb(fill).darker()
                    }
                })

        rects.append('title')
            .text(d => d.split(' ')[0] + ' confidence, ' + d.split(' ')[1] + ' interestingness')


        const lines = [{'x1': legendwidth, 'x2': -5, 'y1': legendwidth, 'y2': legendwidth},
            {'x1': legendwidth, 'x2': legendwidth, 'y1': legendwidth, 'y2': -5}]

        legendSvg.selectAll('lines')
            .data(lines)
            .enter()    
                .append('line')
                .attrs(d => d)
                .attr('marker-end', "url(#arrow)")
                .styles({
                    'stroke': 'black',
                    'stroke-width': 2
                })

        const titleData = [
            {'label':'Confidence', 'value': 'conf', 'x': legendwidth/2 - 5, 
                'y': legendwidth + 10, 
                'rotate': 0},
            {'label':'Interestingness', 'value': 'int', 'x': legendwidth + 10, 
                'y': legendwidth/2 - 5, 
                'rotate': -90}]

        legendSvg.selectAll('text')
            .data(titleData)
            .enter()
                .append('text')
                .attr('transform', (d, i) => `translate(${d.x}, ${d.y})rotate(${d.rotate})`)
                .text(d => d.label)
                .styles({
                    'text-anchor': 'middle',
                    'fill': '#000',
                    'font-size': '12px'
                })
                .style('cursor', 'help')
                .append('title')
                .text(d => d.label + ' ranges from ' + this.extent[d.value].min + ' to ' + this.extent[d.value].max)

        legendSvg.attr('transform', `translate(${left}, 0)rotate(45)`)
    }

    drawSymmetryLegend() {
        // ---------------------------------------------------------------
        // symmetry legend
        let top = 150;
        let left = 25;
        const rectSide = 15;
        
        const symGroup = this.svg.append('g')
            .attr('id', 'legend-symmetry')
            .attr('transform', `translate(${left}, ${top})`)

        symGroup.append('text')
            .style('fill', '#000')
            .attrs({
                'x': 0,
                'y': 0
            })
            .text('The rule is')

        const input = ['Symmetric', 'Not symmetric']    
        let group = symGroup.selectAll('g.symm')
            .data(input)
            .enter()
                .append('g')
            
        group.append('rect')
            .attrs((_,i) => {
                return {
                    'x': 0,
                    'y': 5 + (20 * i),
                    'width': rectSide,
                    'height': rectSide
                }
            })
            .styles((d,i) => {
                return {
                    'fill': i == 0 ? "url('##000-pattern')" : '#000'
                }
            })
        group.append('text')
            .attrs((_,i) => {
                return {
                    'x': 20,
                    'y': 15 + (20 * i)
                }
            })
            .style('fill', '#000')
            .text(d => d)
    }

    getColor(d) {
        const confGroup = this.confScale(d.confidence)
        const intGroup = this.intScale(d.interestingness)
        return this.bivariateColorScale(`${confGroup} ${intGroup}`)
    }

    
}