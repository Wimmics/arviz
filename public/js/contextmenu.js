const menu = [
    {
        title: function(d, i) {
            return (d.name ? 'Relaunch' : 'Launch') + ' the Graph View with "' + (d.label || d.name) + '" as'
        }
    },
    {
        title: 'Antedecent',
        action: function(d, i) {
            document.querySelector("#arviz").graph.set('source', d.label || d.name)
        }
    },
    {
        title: 'Consequent',
        action: function(d, i) {
            document.querySelector("#arviz").graph.set('target', d.label || d.name)
        }
    }
]

const scatterPlotMenu = [
    {
        title: 'Explore this set of rules in the Circular View',
        action: function(d, i) {
            document.querySelector("#arviz").chord.set(d)
        }
    }
]