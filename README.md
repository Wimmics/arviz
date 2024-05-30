## ARViz (Association Rules Visualization)

ARViz is a generic tool designed to support the exploration of association rules via three visualization techniques that allow one to focus the exploration on (i) items or itemsets, to find and/or describe the rules involving a particular item, and (ii) rules, to detect distinguishable association rules that are worth saving for knowledge acquisition. 

The tool provides an overview of rules through a scatter plot that shows the distribution of rules over confidence and interestingness measures. A chord diagram is used to support rule-based exploration tasks; the thematic descriptors are displayed over the arcs that form the circle, while the rules are represents as ribbons connecting the arcs. Finally, to support item-based tasks, ARViz provides an intuitive portray of antecedent and consequent items involved in rules through an association graph view, where items are represented over two vertical stacks of labeled rectangles at the left and right extremities of the screen, and rules are encoded as diamond-shaped nodes placed at the center of the visualization space connecting the rectangles. 

The tool is currently applied to explore data generated in three distinct projects:

- The [CovidOnTheWeb project](https://www.inria.fr/en/covid-web). Explore the rules [here](https://dataviz.i3s.unice.fr/arviz/covid)

- The [ISSA project](https://issa.cirad.fr/). Explore the rules [here](https://dataviz.i3s.unice.fr/arviz/issa)

- The [CROBORA project](https://crobora.huma-num.fr/welcome-page/). Explore the rules [here](https://dataviz.i3s.unice.fr/arviz/crobora) 

## Usage

To reuse this project, clone the repository and run the following commands:

```bash

npm install 

npm start

```

The application will start at `http://localhost:8030/arviz/:app`, where `:app` stands for the application name (i.e. covid, issa, crobora).

To apply this visualization to a different set of association rules:

1. In the `data/` folder, create a folder named after your application. For instance, in the current version, `covid` refers to the CovidOnTheWeb project. 
2. In your application folder, create a folder named `rules` and drop the association rule file(s) inside (see a file under covid/rules or issa/rules for the expected format)
3. The filtering options are customizable through a `config`file. In the `data/` folder, create a file named `config.json` following the format below:
```js
{
    "lang": [
        "en",
        "fr"
    ],
    "graph": [
        "agrovoc"
    ],
    "min_interestingness": 0.3,
    "min_confidence": 0.7,
    "methods": [
        {
            "label": "No clustering method",
            "key": "no_clustering"
        },
        {
            "label": "Clustering of labels",
            "key": "clust"
        }
    ],
    "rdf": true
}
```
- This application was initially designed to work with the resulting set of rules from an [association rule mining algorithm](https://github.com/Wimmics/association-rules-mining). This algorithm employs various clustering approaches to extract interesting rules. Consequently, the `methods` array contains the different methods used to extract the rules. If your data does not include such information, simply provide an empty array.
- The same applies to the `lang` and `graph` keys; if these are not relevant to your data, provide an empty array.
- The application is designed to explore data from Knowledge Graphs (KG). If your data does not originate from a KG, set the `rdf` key to `false`. In this case, modifications will be necessary, as the application uses SPARQL queries to retrieve information, such as scientific publications that mention the keywords in the association rules. You can extend the `DisplayPanel` class to display relevant information for exploring your rules. Refer to the `PublicationsPanel` and `ImagesPanel` classes for examples.
4. To facilitate the retrieval of data from the knowledge graph, which is the source of the association rules, the `queries.json` file contains a set of queries designed to (i) retrieve the label(s) for each URI (item) involved in the rules, and (ii) retrieve the set of items (such as scientific publications) in the database that include those URIs in their metadata. If you are working with RDF data and can provide these queries, create a file named `queries.json` in your application folder, following the format below:

```js
{
    "documents": "PREFIX wdt: <http://www.wikidata.org/prop/direct/>  SELECT distinct ?article ?abs ?authors ?date ?title ?url FROM <http://ns.inria.fr/covid19/graph/entityfishing>   FROM <http://ns.inria.fr/covid19/graph/wikidata-named-entities-full>  FROM <http://ns.inria.fr/covid19/graph/articles> WHERE { $pattern ?article dct:abstract [rdf:value ?abs]; dct:issued ?date;  dce:creator ?authors;  dct:title ?title;  bibo:doi ?doi;  schema:url ?url. } LIMIT 10000",
    "pattern": "$ann schema:about ?article; oa:hasBody <$body>.",
    "labels": "prefix schema: <http://schema.org/>  prefix oa: <http://www.w3.org/ns/oa#> prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>  select distinct ?uri ?label FROM <http://ns.inria.fr/covid19/graph/entityfishing>   FROM <http://ns.inria.fr/covid19/graph/wikidata-named-entities-full>  FROM <http://ns.inria.fr/covid19/graph/articles>    where { ?a schema:about ?article; oa:hasBody ?uri. ?uri rdfs:label ?label . filter langMatches(lang(?label), 'en') } limit 10000 offset $offset" ,
    "endpoint": "https://covidontheweb.inria.fr/sparql"
}
```
- The `documents` key holds the query used to retrieve resources from the KG. In this case, it searches for scientific publications that include the named entities from the association rules in their metadata.
- The `pattern` key is used to dynamically construct the query by incorporating the URIs from the selected association rules. This key should be tailored to your specific KG and the type of information you aim to retrieve. In the provided example, the query looks for articles that contain any of the $body URIs from the rules, repeating the pattern for each $body value to be searched.
- The `labels` key contains the query for retrieving the labels associated with each URI in the association rules. Instead of using generic labels like "car" or "cat," the system uses the URIs representing these entities in the KG.
- The `endpoint` key specifies the address of the SPARQL endpoint from which the data is fetched using the above queries.

## Cite this work

If you reuse this project, please cite the following publication:

- Aline Menin, Lucie Cadorel, Andrea G. B. Tettamanzi, Alain Giboin, Fabien Gandon, et al.. ARViz: Interactive Visualization of Association Rules for RDF Data Exploration. IV 2021 - 25th International Conference Information Visualisation, Jul 2021, Melbourne / Virtual, Australia. pp.13-20, [10.1109/IV53921.2021.00013](https://dx.doi.org/10.1109/IV53921.2021.00013). ([hal-03292140](https://hal.archives-ouvertes.fr/hal-03292140))

You can also directly cite the source code as follows:

- Aline Menin, & Marco Winckler. (2022). Wimmics/arviz: Association Rules Visualization (v1.0). Zenodo. [https://doi.org/10.5281/zenodo.6511786](https://doi.org/10.5281/zenodo.6511786)

## License

See the [LICENSE file](LICENSE).


