/**
 * LinkedDataViz  
 * Node proxy server
 * Receive query from HTML page, send query to SPARQL endpoint, apply transformation,
 *
 * Yun Tian - Olivier Corby - Marco Winckler - 2019-2020
 * Minh nhat Do - Aline Menin - Maroua Tikat - 2020-2022
**/
const port = 8030

const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const sparql = require('./sparql_helper');
const path = require('path');

const datafiletimeout = 1296000000; /// keep files in cache for 15 days
const datadir = 'data/';

const cachedir = datadir + 'cache/';
if (!fs.existsSync(cachedir)){
    fs.mkdirSync(cachedir);
}

// one cache folder per querying page
const cachefile = {
    'covid': cachedir + 'covid/',
    'issa': cachedir + 'issa/',
}

Object.keys(cachefile).forEach(key => {
    if (!fs.existsSync(cachefile[key]))
        fs.mkdirSync(cachefile[key]);
})

const datafile = {
    'covid': datadir + 'covid/', 
    'issa': datadir + 'issa/'
}

/**
 * HTTP node server
 * Browser form send HTTP request to this node server
 * Send query to SPARQL endpoint and perform transformation 
 * 
 */
const app = express()

// set the view engine to ejs
app.set('view engine', 'ejs');

app.use('/arviz/', express.static(path.join(__dirname, 'public')))

app.use(express.urlencoded({ extended: true }))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); 

async function loadData(req) {
    let params = req.params;
    let data = { rules: [] }
    let dirname = path.join(__dirname, datafile[params.app] + 'rules/')
    if (fs.existsSync(dirname)){
        let filenames = fs.readdirSync(dirname)
        filenames.forEach(filename => {
            let rawdata = fs.readFileSync(path.join(dirname + filename))

            data.rules = data.rules.concat(JSON.parse(rawdata))
        })
    }
    return data
}

app.get('/arviz/:dataset/', async function(req, res) { 
    let config = fs.readFileSync(path.join(__dirname, datafile[req.params.dataset] + 'config_' + req.params.dataset + '.json'))   
    config = JSON.parse(config)
    res.render('index', { appli: req.params.dataset, config: config });
})

app.post('/arviz/:app/data/:vis', async (req, res) => {
    let values = req.body;
    // let query = req.query;
    let data = await loadData(req)

    // apply confidence and interestingness filters
    data.rules = data.rules.filter(d => d.confidence >= values.filtering.conf.min && d.confidence <= values.filtering.conf.max && 
        d.interestingness >= values.filtering.int.min && d.interestingness <= values.filtering.int.max)

    // apply symmetry filter
    data.rules = data.rules.filter(d => values.filtering.symmetry && values.filtering.no_symmetry ? true : 
        (values.filtering.symmetry ? d.isSymmetric : (values.filtering.no_symmetry ? !d.isSymmetric : false)))
    
    values.uncheck_methods.forEach(d => { // not working, verify!
        data.rules = data.rules.filter(e => !e.cluster.startsWith(d) )
    })
    

    values.langs.forEach(d => { // not working, verify!
        data.rules = data.rules.filter(e => e.lang != d )
    })

    let result = null
    if (req.params.vis === 'graph')
        result = data.rules.filter(d => d[values.type].includes(values.value))
    else if (req.params.vis === 'circular') {
        result = { count: data.rules.length }
        if (values.sort) data.rules.sort((a,b) => b[values.sort] - a[values.sort])
        if (values.last) {
            result.data = data.rules.slice(values.first, values.last)
        } else {
            result.data = data.rules.filter(d => d.confidence === values.confidence && d.interestingness === values.interestingness && d.isSymmetric === values.isSymmetric)
        }
    } else {
        result = { count: {} }
        data.rules.forEach(d => {
            const key = d.confidence+'-'+d.interestingness+'-'+d.isSymmetric;
            if (result.count[key]) {
                result.count[key] ++;
            } else result.count[key] = 1;
        })

        result.data = data.rules.filter( (d,i) => data.rules.findIndex(e => e.confidence === d.confidence && e.interestingness === d.interestingness && e.isSymmetric === d.isSymmetric) === i)

        result.data.sort((a,b) => {
            const keyA = a.confidence+'-'+a.interestingness+'-'+a.isSymmetric,
                keyB = b.confidence+'-'+b.interestingness+'-'+b.isSymmetric;
            return result.count[keyB] - result.count[keyA]
        })
    }
    res.send(JSON.stringify(result))
})

app.get('/arviz/:dataset/about', function(req, res) {
    res.render('about', { appli: req.params.dataset });
})

app.get('/arviz/api/:app/uris', async function(req, res) {

    let filePath = path.join(__dirname, datafile[req.params.app] + 'labels_uri.json')
    let uris = []
    if (fs.existsSync(filePath)) {
        let rawdata = fs.readFileSync(filePath)
        uris = JSON.parse(rawdata)
        // res.sendFile(filePath)
    } else {

        let queries = fs.readFileSync(path.join(__dirname, datafile[req.params.app] + 'queries.json'))
        queries = JSON.parse(queries)
        
        let endpoint = queries.endpoint
        let graphs = Object.keys(queries.uris)

        for (let i = 0; i < graphs.length; i++) {
            let offset = 0
            let query = queries.uris[graphs[i]]

            let result = await sparql.sendRequest(query.replace('$offset', offset), endpoint)
            try {
                result = JSON.parse(result)
                let bindings = result.results.bindings

                while ( bindings.length ) {
                    uris = uris.concat(bindings)

                    offset += 10000;
                    result = await sparql.sendRequest(query.replace('$offset', offset), endpoint)
                    result = JSON.parse(result)
                    bindings = result.results.bindings
                }

                fs.writeFileSync(path.join(__dirname, datafile[req.params.app] + 'labels_uri.json'), JSON.stringify(uris), null, 4)
            } catch(e) {
                console.log(e)
            }
        }
    }

    let data = await loadData(req)
    let validLabels = data.rules.map(d => d.source.concat(d.target)).flat()
    let result = uris.filter(d => validLabels.includes(d.label.value))

    res.send(JSON.stringify(result))

})

app.get('/arviz/api/:app/publications', async function(req, res) {
    let values = req.query.values
    values = values.split(',') // array of uris

    let queries = fs.readFileSync(path.join(__dirname, datafile[req.params.app] + 'queries.json'))
    queries = JSON.parse(queries)

    let query = queries.documents
    let endpoint = queries.endpoint
    let pattern = queries.pattern

    let patternTuned = ''
    for (let i = 0; i < values.length; i++) {
        let annvar = `?a${i}`
        patternTuned += pattern.replace('$ann', annvar).replace('$ann', annvar).replace('$body', values[i])
    }

    query = query.replace('$pattern', patternTuned)

    let result = await sparql.sendRequest(query, endpoint)
    let data = []
    try {    
        result = JSON.parse(result)
        data = result.results.bindings
    } catch(e) {
        console.log(e)
    }

    res.send(JSON.stringify(data))
})

///// end arviz routes ///////////////////////////


app.listen(port, () => { 
    console.log(`Server started at port ${port}.`)
});