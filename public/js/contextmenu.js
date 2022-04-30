const menu = [
    {
        title: function(d, i) {
            return (d.name ? 'Relaunch' : 'Launch') + ' the Graph View with "' + (d.label || d.name) + '" as'
        }
    },
    {
        title: 'Antedecent',
        action: function(d, i) {
            charts.graph.setGraphView('source', d.label || d.name)
        }
    },
    {
        title: 'Consequent',
        action: function(d, i) {
            charts.graph.setGraphView('target', d.label || d.name)
        }
    }
]

const scatterPlotMenu = [
    {
        title: 'Explore this set of rules in the Circular View',
        action: function(d, i) {
            // const selected = charts.scatterplot.data.filter(e => e.confidence == d.confidence && e.interestingness == d.interestingness && e.isSymmetric == d.isSymmetric)

            charts.chord.setChordDiagramView(d)
        }
    }
]