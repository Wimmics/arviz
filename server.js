/**
 * LinkedDataViz  
 * Node proxy server
 * Receive query from HTML page, send query to SPARQL endpoint, apply transformation,
 *
 * Yun Tian - Olivier Corby - Marco Winckler - 2019-2020
 * Minh nhat Do - Aline Menin - Maroua Tikat - 2020-2022
**/


const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const sparql = require('./sparql_helper');
const path = require('path');
const https = require("https")
const fetch = require('node-fetch')


const datadir = 'data/';

const cachedir = datadir + 'cache/';
if (!fs.existsSync(cachedir)){
    fs.mkdirSync(path.join(__dirname, cachedir));
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
    let dirname = path.join(__dirname, datadir + params.app + '/rules/')
    if (fs.existsSync(dirname)){
        let filenames = fs.readdirSync(dirname)
        filenames = filenames.filter(d => d.includes('.json'))
        filenames.forEach(filename => {
            let rawdata = fs.readFileSync(path.join(dirname + filename))

            data.rules = data.rules.concat(JSON.parse(rawdata))
        })
    }
    return data
}

app.get('/arviz/', function(req, res) {
    res.render('about');
})

app.get('/arviz/:app/', async function(req, res) { 
    res.render('index', { app: req.params.app, params: req.query });
})

app.get('/arviz/:app/config', async function(req, res) {
    res.sendFile(path.join(__dirname, datadir + req.params.app + '/config.json'))
})

app.post('/arviz/:app/data/:vis', async (req, res) => {
    let values = req.body;
    let data = await loadData(req)

    // apply confidence and interestingness filters
    data.rules = data.rules.filter(d => d.confidence >= values.filtering.conf.min_sel && d.confidence <= values.filtering.conf.max_sel && 
        d.interestingness >= values.filtering.int.min_sel && d.interestingness <= values.filtering.int.max_sel)


    // apply symmetry filter
    data.rules = data.rules.filter(d => values.filtering.symmetry && values.filtering.no_symmetry ? true : 
        (values.filtering.symmetry ? d.isSymmetric : (values.filtering.no_symmetry ? !d.isSymmetric : false)))
    
    values.uncheck_methods.forEach(d => { // not working, verify!
        let regex = new RegExp(d)
        data.rules = data.rules.filter(e => !e.cluster.match(regex) )
    })
   
    let result = null
    if (req.params.vis === 'graph') {
        result = data.rules.filter(d => d.source.includes(values.value) || d.target.includes(values.value) )
    } else if (req.params.vis === 'chord') {
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



app.get('/arviz/api/:app/labels', async function(req, res) {
    let data = await loadData(req)

    let filePath = path.join(__dirname, datadir + req.params.app + '/labels.json')

    let labels = []
    if (fs.existsSync(filePath)) {
        labels = fs.readFileSync(filePath)
        labels = JSON.parse(labels)
    } else {

        let queriesFile = path.join(__dirname, datadir + req.params.app + '/queries.json')
        let queries;
        if (fs.existsSync(queriesFile)) {
            queries = fs.readFileSync(queriesFile)
            queries = JSON.parse(queries)
        }

        switch(req.params.app) {
            case 'covid':
                let query = queries.labels
                query = query.replace(/\$lang/g, "en") // TODO: replace lang according to view settings
                labels = await runQuery(query, queries.endpoint)
                break;
            case 'issa':
                let graphs = Object.keys(queries.labels)

                let values = []
                for (let i = 0; i < graphs.length; i++) {
                    let query = queries.labels[graphs[i]]
                    query = query.replace(/\$lang/g, "en") // TODO: replace lang according to view settings

                    values = await runQuery(query, queries.endpoint)
                }

                let uniqueURI = values.map(d => d.uri.value)
                uniqueURI = uniqueURI.filter( (d,i) => uniqueURI.indexOf(d) === i)

                for (let uri of uniqueURI) {
                    let uri_data = values.filter( d => d.uri.value === uri)
                    let prefLabel = uri_data[0].prefLabel.value
                    let altLabels = [prefLabel]

                    uri_data.forEach(d => { if (d.altLabel) altLabels.push(d.altLabel.value) })

                    let value = uri.replace("http://aims.fao.org/aos/agrovoc/c_", "")
                    let rules = data.rules.filter(e => e.source.includes(value) || e.target.includes(value))
                    
                    labels.push({
                        uri: uri,
                        prefLabel: prefLabel,
                        altLabels: altLabels,
                        count: rules.length
                    })
                }
                
                break;
            case 'crobora':
                labels = data.rules.map(d => d.antecedents.concat(d.consequents)).flat()
                labels = labels.filter((d,i) => labels.indexOf(d) === i)
                labels = labels.map(d => {
                    let values = d.split('--')
                    return {
                        key: d,
                        type: values[0],
                        value: values[1],
                        count: data.rules.filter(e => e.source.includes(d) || e.target.includes(d)).length
                    }
                })
                break;
        }

        fs.writeFileSync(filePath, JSON.stringify(labels), null, 4)
    }

    async function runQuery(query, endpoint) {
        let offset = 0,
            result, 
            bindings,
            values = []
        
        try {

            do {
                result = await sparql.sendRequest(query.replace('$offset', offset), endpoint)
                result = JSON.parse(result)
                bindings = result.results.bindings

                values = values.concat(bindings)
                offset += 10000;
            } while ( bindings.length ) 

        } catch(e) {
            console.log(e)
        }

        return values
    }
    

    res.send(JSON.stringify(labels))
})

app.post('/arviz/api/:app/images', async function(req, res) {
    let params = req.body;

    let result = await fetch("https://crobora.huma-num.fr/crobora-api/search/imagesOR", {
            method: "POST", 
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify(params) })
        .then(async function(response){
            if(response.status >= 200 && response.status < 300){
            return await response.text().then(data => {
                return data
            })}
            else return response
        })
        
    res.send(result)
})

app.get('/arviz/api/:app/publications', async function(req, res) {
    let values = req.query.values.split(',') // array of uris

    let queries = fs.readFileSync(path.join(__dirname, datadir + req.params.app + '/queries.json'))
    queries = JSON.parse(queries)

    let query = queries.documents
    let endpoint = queries.endpoint
    let pattern = queries.pattern

    let patternTuned = ''
    for (let i = 0; i < values.length; i++) {
        let annvar = `?a${i}`
        patternTuned += pattern.replace('$ann', annvar).replace('$body', values[i])
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

const port = 8030
const portHTTPS = 8033

app.listen(port, () => { console.log(`Server started at port ${port}.`) })

try {
    var privateKey = fs.readFileSync( '/etc/httpd/certificate/exp_20240906/dataviz_i3s_unice_fr.key' );
    var certificate = fs.readFileSync( '/etc/httpd/certificate/exp_20240906/dataviz_i3s_unice_fr_cert.crt' );
    var ca = fs.readFileSync( '/etc/httpd/certificate/exp_20240906/dataviz_i3s_unice_fr_AC.cer' );
    var options = {key: privateKey, cert: certificate, ca: ca};
    https.createServer( options, function(req,res)
    {
        app.handle( req, res );
    } ).listen( portHTTPS , () => { console.log(`HTTPS server started at port ${portHTTPS}`) } )
} catch(e) {
    console.log("Could not start HTTPS server")
}