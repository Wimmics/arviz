(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('d3-array'), require('d3-path')) :
  typeof define === 'function' && define.amd ? define(['exports', 'd3-array', 'd3-path'], factory) :
  (factory((global.d3 = global.d3 || {}),global.d3,global.d3));
}(this, function (exports,d3Array,d3Path) { 'use strict';

  var cos = Math.cos;
  var sin = Math.sin;
  var pi = Math.PI;
  var halfPi = pi / 2;
  var tau = pi * 2;
  var max = Math.max;

  function compareValue(compare) {
    return function(a, b) {
      return compare(
        a.source.value + a.target.value,
        b.source.value + b.target.value
      );
    };
  }

  function forkchord() {
    var padAngle = 0,
        sortGroups = null,
        sortSubgroups = null,
        sortChords = null,
        ribbonValue = 'value',
        parseValue = null,
        sortCriteria = 'alpha';

    function forkchord(data) {

      let groupKeys = getGroups(),
          n = groupKeys.length, // number of groups
          groupSums = {},
          groupIndex = d3Array.range(n),
          subgroupIndex = [],
          chords = [],
          groups = chords.groups = new Array(n),
          subgroups = chords.subgroups = new Array(n),
          z,
          k,
          x,
          x0,
          dx,
          i,
          j;

      function getGroups(){
        let keys = [];
        data.forEach(d => {
          d.source.forEach(s => {
            if (!keys.includes(s)) keys.push(s);
          })
          d.target.forEach(t => {
            if (!keys.includes(t)) keys.push(t);
          })
        })
        return keys;
      }

      // Compute the sum.
      // z : total sum of groups
      // i : group index
      z = 0, i = -1; while (++i < n) {

        if (!groupSums[i]){
          groupSums[i] = {}
        }
        
        // recover the value for the links where the group is target
        let input = data.filter(d => d.target.includes(groupKeys[i]))
        let targetIndices = []
        input.forEach(d => { // look for source indices
          d.source.forEach(e => {
            let index = groupKeys.indexOf(e)
            if (!targetIndices.includes(index)) targetIndices.push(index)
          })
        })
        // input = d3.sum(input.map(d => parseValue ? parseValue(+d[ribbonValue]) : +d[ribbonValue]))
        input = input.length * 10; // give every chord the same value

        // and source
        let output = data.filter(d => d.source.includes(groupKeys[i]))
        output.forEach(d => { // look for target indices
          d.target.forEach(e => {
            let index = groupKeys.indexOf(e)
            if (!targetIndices.includes(index)) targetIndices.push(index)
          })
        })
        // output = d3.sum(output.map(d => parseValue ? parseValue(+d[ribbonValue]) : +d[ribbonValue]))
        output = output.length * 10;

        groupSums[i].out = output;
        groupSums[i].in = input;
        
        z += input + output;
        
        subgroupIndex.push(targetIndices.sort());
      }

      // Sort groups…
      if (sortGroups) groupIndex.sort(function(a, b) {
        // sort groups according to number of subgroups associated to it
        if (sortCriteria == 'nbrules') {
          let nodesA = data.filter(d => d.target.includes(groupKeys[a]) || d.source.includes(groupKeys[a])),
            nodesB = data.filter(d => d.target.includes(groupKeys[b]) || d.source.includes(groupKeys[b]))
          return sortGroups(nodesA.length, nodesB.length);
        } 
        
        return groupKeys[a].localeCompare(groupKeys[b]);
      });

      // Sort subgroups… (not being used, sorting is done directly when computing the angles ordering chords which the node is source before the target ones)
      if (sortSubgroups) subgroupIndex.forEach(function(d, i) {
        d.sort(function(a, b) {
          return sortSubgroups(d3Array.sum(matrix[i][a]), d3Array.sum(matrix[i][b]));
        });
      });

      // Convert the sum to scaling factor for [0, 2pi].
      // TODO Allow start and end angle to be specified?
      // TODO Allow padding to be specified as percentage?
      z = max(0, tau - padAngle * n) / z; // compute the angle (arc length) of each group
      dx = z ? padAngle : tau / n; // compute space between arcs
      
      // Compute the start and end angle for each group and subgroup.
      // Note: Opera has a bug reordering object literal properties!
      
      x = 0, groupIndex.forEach(i => {
      
        let a0 = x, // angle
        links = [data.filter(d => d.source.includes(groupKeys[i])), // links contain nodes ordered by whether they are source or target
          data.filter(d => d.target.includes(groupKeys[i]))];

        subgroups[i] = []
        links.forEach(nodes => {  
          nodes.forEach(d => {
            // let v = parseValue ? parseValue(+d[ribbonValue]) : +d[ribbonValue],

            let v = 10,
              sources = d.source.map(s => groupKeys.indexOf(s)),
              targets = d.target.map(t => groupKeys.indexOf(t));

            let item = {
              label: groupKeys[i],
              index: sources,
              subindex: targets,
              startAngle: a0,
              endAngle: a0 + v * z,
              value: v,
              symmetric: d.isSymmetric,
              cluster: d.cluster
            }
          
            subgroups[i].push(item)

            a0 += v * z;
            
          })
          
        })  
       
        x0 = x;
	      x += (groupSums[i].in + groupSums[i].out) * z;
	      groups[i] = {
            label: groupKeys[i],
            index: i,
            children: subgroups[i].length,
	    		  startAngle: x0,
	    		  endAngle: x,
	    		  value: {
              in: groupSums[i].in,
              out: groupSums[i].out
            }
	      };
	      x += dx;
        
      })

      
      // Generate chords for each (non-empty) subgroup-subgroup link.
      i = -1; while (++i < n) {
        j = -1; while (++j < subgroups[i].length) {
          
          let _this = subgroups[i][j],
            sources = [],
            targets = [];

          _this.index.forEach(index => {
            if (index == i) sources.push(_this)
            else {
              let node = subgroups[index].filter(e => e.index.equals(_this.index) && e.subindex.equals(_this.subindex) && e.value == _this.value && e.cluster == _this.cluster)[0]
              sources.push(node);
            }
          })  

          _this.subindex.forEach(index => {
            if (index == i) targets.push(_this)
            else {
              let node = subgroups[index].filter(e => e.index.equals(_this.index) && e.subindex.equals(_this.subindex) && e.value == _this.value && e.cluster == _this.cluster)[0]
              targets.push(node)
            }
          })
          
          // let exists = chords.some(d => _this.index.equals(d.source[0].index) && _this.subindex.equals(d.target[0].subindex))
          // if (!exists) {
            chords.push({source: sources, target: targets})
          // }
        }
      }

      return sortChords ? chords.sort(sortChords) : chords;
    }

    forkchord.parseValue = function(_) {
      return arguments.length ? (parseValue = _, forkchord) : parseValue;
    }

    forkchord.ribbonValue = function(_){
      return arguments.length ? (ribbonValue = _, forkchord) : ribbonValue;
    };

    forkchord.padAngle = function(_) {
      return arguments.length ? (padAngle = max(0, _), forkchord) : padAngle;
    };

    forkchord.sortGroups = function(_) {
      return arguments.length ? (sortGroups = _, forkchord) : sortGroups;
    };

    forkchord.sortSubgroups = function(_) {
      return arguments.length ? (sortSubgroups = _, forkchord) : sortSubgroups;
    };

    forkchord.sortChords = function(_) {
      return arguments.length ? (_ == null ? sortChords = null : (sortChords = compareValue(_))._ = _, forkchord) : sortChords && sortChords._;
    };

    forkchord.sortCriteria = function(_){
      return arguments.length ? (sortCriteria = _, forkchord) : sortCriteria;
    }

    return forkchord;
  }

  var slice = Array.prototype.slice;

  function constant(x) {
    return function() {
      return x;
    };
  }

  function defaultArrowheadRadius() {
    return 10;
  }

  function defaultSource(d) {
    return d.source;
  }

  function defaultTarget(d) {
    return d.target;
  }

  function defaultRadius(d) {
    return d.radius;
  }

  function defaultStartAngle(d) {
    return d.startAngle;
  }

  function defaultEndAngle(d) {
    return d.endAngle;
  }

  function ribbon(headRadius) {
    var source = defaultSource,
        target = defaultTarget,
        radius = defaultRadius,
        startAngle = defaultStartAngle,
        endAngle = defaultEndAngle,
        headRadius = defaultArrowheadRadius,
        context = null;

    function ribbon() {
      let buffer,
        argv = slice.call(arguments),
        sources = source.apply(this, argv),
        targets = target.apply(this, argv);
      
      if (!context) context = buffer = d3Path.path();

      const hr = headRadius ? +headRadius.apply(this, arguments) : null;
      
      
      sources.forEach(function(s,i) {
        let sr = +radius.apply(this, (argv[0] = s, argv)),
          sr2 = s.symmetric && hr ? sr - hr : null,
          sa0 = startAngle.apply(this, argv) - halfPi,
          sa1 = endAngle.apply(this, argv) - halfPi,
          sx0 = (s.symmetric && hr ? sr2 : sr) * cos(sa0), 
          sy0 = (s.symmetric && hr ? sr2 : sr) * sin(sa0),
          sa2 = (sa0 + sa1) / 2;

          context.moveTo(sx0, sy0);

          targets.forEach(function(t) {
            let tr = +radius.apply(this, (argv[0] = t, argv)),
              ta0 = startAngle.apply(this, argv) - halfPi,
              ta1 = endAngle.apply(this, argv) - halfPi;
              
              if (s.symmetric && hr) {  
                context.lineTo(sr * cos(sa2), sr * sin(sa2));
                context.lineTo(sr2 * cos(sa1), sr2 * sin(sa1));
              }else {
                context.arc(0, 0, sr, sa0, sa1);
              }
    

              if (sa0 !== ta0 || sa1 !== ta1) { // TODO sr !== tr?
                if (hr) {
                  let tr2 = tr - hr, 
                    ta2 = (ta0 + ta1) / 2;
                  context.quadraticCurveTo(0, 0, tr2 * cos(ta0), tr2 * sin(ta0));
                  context.lineTo(tr * cos(ta2), tr * sin(ta2));
                  context.lineTo(tr2 * cos(ta1), tr2 * sin(ta1));
                } else {
                  context.quadraticCurveTo(0, 0, tr * cos(ta0), tr * sin(ta0));
                  context.arc(0, 0, tr, ta0, ta1);
                }
              }
              context.quadraticCurveTo(0, 0, sx0, sy0);
          })
      })  
      context.closePath();
      if (buffer) return context = null, buffer + "" || null; 
    }

    if (headRadius) ribbon.headRadius = function(_) {
      return arguments.length ? (headRadius = typeof _ === "function" ? _ : constant(+_), ribbon) : headRadius;
    };

    ribbon.radius = function(_) {
      return arguments.length ? (radius = typeof _ === "function" ? _ : constant(+_), ribbon) : radius;
    };

    ribbon.startAngle = function(_) {
      return arguments.length ? (startAngle = typeof _ === "function" ? _ : constant(+_), ribbon) : startAngle;
    };

    ribbon.endAngle = function(_) {
      return arguments.length ? (endAngle = typeof _ === "function" ? _ : constant(+_), ribbon) : endAngle;
    };

    ribbon.source = function(_) {
      return arguments.length ? (source = _, ribbon) : source;
    };

    ribbon.target = function(_) {
      return arguments.length ? (target = _, ribbon) : target;
    };

    ribbon.context = function(_) {
      return arguments.length ? ((context = _ == null ? null : _), ribbon) : context;
    };

    return ribbon;
  }

  exports.forkchord = forkchord;
  exports.ribbon = ribbon;

  Object.defineProperty(exports, '__esModule', { value: true });

}));