const menu = [
    {
        title: function(d, i) {
            return (d.name ? 'Relaunch' : 'Launch') + ' the Graph View for "' + document.querySelector("#arviz").getLabel(d.label || d.name) + '"'
        },
        action: function(d, i) {
            document.querySelector("#arviz").setActiveChart('graph', d.label || d.name)
        }
    }
]

const scatterPlotMenu = [
    {
        title: 'Explore this set of rules in the Circular View',
        action: function(d, i) {
            document.querySelector("#arviz").setActiveChart("chord", d)
        }
    }
]