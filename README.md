## ARViz (Association Rules Visualization)

ARViz is a generic tool designed to support the exploration of association rules via three visualization techniques that allow one to focus the exploration on (i) items or itemsets, to find and/or describe the rules involving a particular item, and (ii) rules, to detect distinguishable association rules that are worth saving for knowledge acquisition. 

The tool provides an overview of rules through a scatter plot that shows the distribution of rules over confidence and interestingness measures. A chord diagram is used to support rule-based exploration tasks; the thematic descriptors are displayed over the arcs that form the circle, while the rules are represents as ribbons connecting the arcs. Finally, to support item-based tasks, ARViz provides an intuitive portray of antecedent and consequent items involved in rules through an association graph view, where items are represented over two vertical stacks of labeled rectangles at the left and right extremities of the screen, and rules are encoded as diamond-shaped nodes placed at the center of the visualization space connecting the rectangles. 

The tool is currently applied to two different datasets:

- The CovidOnTheWeb dataset, which association rules can be explored [here](http://dataviz.i3s.unice.fr/arviz/covid)

- The ISSA dataset, which association rules can be explored [here] (http://dataviz.i3s.unice.fr/arviz/issa)

## Usage

To reuse this project, clone the repository and run the following commands:

```bash

npm install 

npm start

```

The application will start at `http://localhost:8030/arviz/:app`, where `:app` stands for the application name (e.g. covid, issa).

To apply this visualization to a different set of association rules:

- In the `data/` folder, create a folder named after your application 
- In your application folder, create a folder named `rules` and drop the association rule file(s) inside (see a file under covid/rules or issa/rules for the expected format)
- In the `data/` folder, create a config file following the format below. This file will serve to set up the filtering options. 
    - This application was first designed to be used with the resulting set of rules of an [algorithm of association rule mining](https://github.com/Wimmics/association-rules-mining) that uses different clustering approaches in an attempt to extract interesting rules. Thus, the methods array, contain the different methods used to extract the rules. If your data do not contain such information, simply provide an empty array. 
    - The same applies for `lang` and `graph` keys; if this is not applicable to your data, provide an empty array.
- Although applicable to any dataset of association rules, this visualization was designed to be used with rules extracted from RDF datasets. Thus, the `queries.json` file contain a set of queries that are used to (i) retrieve the URI of every label (item) involved in rules, which are subsequently used to (ii) retrieve the set of items (in our example, scientific publications) in the database that co-mention those labels. If you are dealing with RDF data and can provide these queries, then provide a `queries.json` file in your application folder. Otherwise, set the `rdf` key in the config file to `false`.

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

## License

See the [LICENSE file](LICENSE).

## Cite this work

If you reuse this project, please cite the following publication:

- Aline Menin, Lucie Cadorel, Andrea G. B. Tettamanzi, Alain Giboin, Fabien Gandon, et al.. ARViz: Interactive Visualization of Association Rules for RDF Data Exploration. IV 2021 - 25th International Conference Information Visualisation, Jul 2021, Melbourne / Virtual, Australia. pp.13-20, [10.1109/IV53921.2021.00013](https://dx.doi.org/10.1109/IV53921.2021.00013). ([hal-03292140](https://hal.archives-ouvertes.fr/hal-03292140))
