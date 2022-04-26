/**
 * LinkedDataViz  
 * Node proxy server
 * Receive query from HTML page, send query to SPARQL endpoint, apply transformation,
 *
 * Yun Tian - Olivier Corby - Marco Winckler - 2019-2020
 * Minh nhat Do - Aline Menin - Maroua Tikat - 2020-2022
**/
const port = 3000

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

app.get('/arviz/:dataset/', function(req, res) {
    res.render('index', { appli: req.params.dataset });
})

app.get('/arviz/:dataset/data', (req, res) => {
    let params = req.params;

    let data = { rules: [], uris: null }
    let dirname = path.join(__dirname, datafile[params.dataset] + 'rules/')
    if (fs.existsSync(dirname)){
        let filenames = fs.readdirSync(dirname)
        filenames.forEach(filename => {
            let rawdata = fs.readFileSync(path.join(dirname + filename))

            data.rules = data.rules.concat(JSON.parse(rawdata))
        })
    }
    
    res.send(JSON.stringify(data))
})

app.get('/arviz/:dataset/about', function(req, res) {
    res.render('about', { appli: req.params.dataset });
})

app.get('/arviz/api/:app/uris', async function(req, res) {

    let filePath = path.join(__dirname, datafile[req.params.app] + 'labels_uri.json')
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath)
    } else {

        let queries = fs.readFileSync(path.join(__dirname, datafile[req.params.app] + 'queries.json'))
        queries = JSON.parse(queries)
        
        let endpoint = queries.endpoint
        let graphs = Object.keys(queries.uris)

        let data = []

        for (let i = 0; i < graphs.length; i++) {
            let offset = 0
            let query = queries.uris[graphs[i]]

            let result = await sparql.sendRequest(query.replace('$offset', offset), endpoint)
            try {
                result = JSON.parse(result)
                let bindings = result.results.bindings

                while ( bindings.length ) {
                    data = data.concat(bindings)

                    offset += 10000;
                    result = await sparql.sendRequest(query.replace('$offset', offset), endpoint)
                    result = JSON.parse(result)
                    bindings = result.results.bindings
                }

                fs.writeFileSync(path.join(__dirname, datafile[req.params.app] + 'labels_uri.json'), JSON.stringify(data), null, 4)
            } catch(e) {
                console.log(e)
            }
        }

        res.send(JSON.stringify(data))
    }
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