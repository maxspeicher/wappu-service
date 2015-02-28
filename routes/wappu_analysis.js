var global = require('../globals');
var numbers = require('numbers');
var stats = require('statsjs');

var httpPost = global.fn.httpPost;
var mlUtils = global.vars.ML_UTILS;

/*
 * HELPER FUNCTIONS
 */

/**
 * Processes a set of feature values (= 1 user), as present in the wappu_features table in the DB, and adds it to an
 * object that aggegates all feature values.
 *
 * @param features The set of feature values from 1 user.
 * @param featureValues The object in which all feature values are aggregated.
 */
var processFeatureValues = function(features, featureValues) {
    // e = feature name (e.g., clicks)
    for (var e in features) {
        // f = component name (e.g., #navbar)
        for (var f in features[e]) {
            // Features are calculated on a per-component basis.
            var key = e + '_' + f;

            /*
             * Record absolute as well as relative values for each interaction feature.
             */
            // if (!featureValues[key + '_abs']) {
            //     featureValues[key + '_abs'] = [];
            // }

            // featureValues[key + '_abs'].push(features[e][f]);

            if (f == 'total') {
                continue;
            }

            if (!featureValues[key + '_rel']) {
                featureValues[key + '_rel'] = [];
            }
            
            featureValues[key + '_rel'].push(features[e].total == 0 ? 0 : (features[e][f] / features[e].total));
        }
    }
};

/*
 * BUSINESS LOGIC
 */

exports.getSignificance = function(req, res) {
    var postData = {
        x: req.body.x,
        y: req.body.y
    };

    httpPost(mlUtils.host, mlUtils.port + '', mlUtils.path + '/test/mann-whitney-u', postData, function(output) {
        res.send(req.query.callback + '(' + output + ');');
    });
};

exports.getUsability = function(req, res) {
    if (!req.query.projectId) {
    	res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis?projectId=42</tt>.'
        });
        
        return;
    }

    var data = {
        usabilityValues: [],
        expectedUsability: 0,
        usabilityStdev: 0,
        inuitItems: {}
    };

    var featureValues = {};

    var interfaceVersion = req.query.interfaceVersion || 'A';
    var projectId = req.query.projectId;

    var processUsabilityItems = function(usabilityItems) {
    	var usabilityValue = 0;

        for (var e in usabilityItems) {
            // classValue \in {-1,0,+1}
            var classValue = usabilityItems[e];

            if (!data.inuitItems[e]) {
                data.inuitItems[e] = {
                    aggregatedProbabilities: [0, 0, 0],
                    avgProbabilities: [0, 0, 0],
                    expectedValue: 0,
                    stdev: 0,
                    instances: 0
                };
            }

            data.inuitItems[e].aggregatedProbabilities[classValue+1]++;
            data.inuitItems[e].instances++;

            // The sum of all Inuit item ratings is the overall usability value (\in [-7,7]).
            usabilityValue += classValue;
        }

        data.usabilityValues.push(usabilityValue);
    };

    var getPredictions = function(callback) {
        /*
         * For predictions, use the models trained from the other version of the interface since at least one version
         * must provide the usability questionnaire for A/B testing.
         */
        var interfaceVersionToBeUsed = interfaceVersion == 'A' ? 'B' : 'A';
        
        var postData = {
            projectId: projectId,
            interfaceVersion: interfaceVersionToBeUsed,
            classifier: global.vars.WAPPU_CLASSIFIER,
            itemName: '',
            featureNames: '',
            featureValues: ''
        };

        /*
         * Prepare postData in the same way as required for the /classifier/train API request (see wappu.js).
         */
        for (var e in featureValues) {
            postData.featureNames += ((postData.featureNames ? ',' : '') + e);
            postData.featureValues += ((postData.featureValues ? ',' : '') + featureValues[e]);
        }

        var usabilityItems = [];
        var predictions = {};

        for (var e in global.vars.USABILITY_ITEMS) {
            usabilityItems.push(e);
        }

        var predictUsabilityItems = function(i) {
            // Contrary to /classifier/train, itemValues does not need to be set.
            postData.itemName = usabilityItems[i];

            httpPost(mlUtils.host, mlUtils.port + '', mlUtils.path + '/classifier/predict', postData, function(output) {
                /*
                 * The API returns an array of objects
                 * { votesForInstance: [...], normalizedVotesForInstance: [...] }
                 * which are equivalent to aggregatedProbabilities and avgProbabilites computed for interface A,
                 * i.e., sum(votesForInstance) != 1; sum(normalizedVotesForInstance) = 1.
                 */
                var arrayOfPredictions = JSON.parse(output);

                predictions[usabilityItems[i]] = arrayOfPredictions;

                if (i < usabilityItems.length-1) {
                    predictUsabilityItems(i+1);
                } else {
                    callback(predictions);
                }
            });
        };

        if (postData.featureNames) {
            // data for interface available
            predictUsabilityItems(0);
        } else {
            // no data/predicitons available => predictions = {}
            callback({});
        }
    };

    var processPredictions = function(predictions, callback) {
    	var usabilityValues = [];

        for (var e in predictions) {
            var instances = predictions[e];

            for (var i=0; i<instances.length; ++i) {
                var classValue = 0;

                // classValue \in [-1,+1]
                for (var j=0; j<instances[i].votesForInstance.length; ++j) {
                    classValue += ((j-1) * instances[i].normalizedVotesForInstance[j]);
                }

                if (!data.inuitItems[e]) {
                    data.inuitItems[e] = {
                        aggregatedProbabilities: [0, 0, 0],
                        avgProbabilities: [0, 0, 0],
                        expectedValue: 0,
                        stdev: 0,
                        instances: 0
                    };
                }

                // Aggregate the normalized votes for instance.
                for (var j=0; j<instances[i].votesForInstance.length; ++j) {
                    data.inuitItems[e].aggregatedProbabilities[j] += instances[i].normalizedVotesForInstance[j];
                }

                data.inuitItems[e].instances++;

                if (!usabilityValues[i]) {
                    usabilityValues[i] = 0;
                }

                // The sum of all Inuit item predictions is the overall usability value (\in [-7,7]).
                usabilityValues[i] += classValue;
            }
        }

        data.usabilityValues = usabilityValues;

        callback();
    };

    var calculateUsability = function(callback) {
        try {
            var mySqlConnection = require('../db').connect();

            /*
             * Fetch datasets from the DB.
             */
            mySqlConnection.query('SELECT * FROM wappu_features WHERE project_id = ? AND interface_version = ?',
                    [projectId, interfaceVersion], function(err, rows) {
                if (err) {
                    console.error(err);
                }

                var finalizeData = function() {
                    for (var e in data.inuitItems) {
                        var item = data.inuitItems[e];

                        if (!item.instances) {
                            continue;
                        }
                        
                        /*
                         * Calculate avg. probabilities (sum = 1) from aggregated probabilities (sum > 1).
                         * Calculate expected value of each item as sum(P(x) * x).
                         */
                        for (var i=0; i<item.avgProbabilities.length; ++i) {
                            item.avgProbabilities[i] = item.aggregatedProbabilities[i] / item.instances;

                            // (i-1) \in {-1,0,+1}
                            item.expectedValue += (item.avgProbabilities[i] * (i-1));
                        }

                        // Calculate standard deviation for each item.
                        for (var i=0; i<item.avgProbabilities.length; ++i) {
                            item.stdev += (item.avgProbabilities[i] * Math.pow(((i-1) - item.expectedValue), 2));
                        }
                    }

                    var dataset = stats(data.usabilityValues);

                    /*
                     * Calculate expected value and stDev of overall usability using statsjs.
                     */
                    data.expectedUsability = dataset.mean();
                    data.usabilityStdev = dataset.stdDev();

                    callback();
                };

                var usabilityItemsAvailable;

                for (var i=0; i<rows.length; ++i) {
                    eval('var usabilityItems = ' + rows[i].usability_items);

                    if (!Object.keys(usabilityItems).length) {
                        usabilityItemsAvailable = false;
                    	eval('var features = ' + rows[i].features);

                    	processFeatureValues(features, featureValues);
                    } else {
                        usabilityItemsAvailable = true;
                    	processUsabilityItems(usabilityItems);
                    }
                }

                // The lists of feature values need to be provided as strings.
                for (var e in featureValues) {
                    featureValues[e] = featureValues[e].join(',');
                }

                if (usabilityItemsAvailable) {
                    finalizeData();
                } else {
                    getPredictions(function(predictions) {
                        processPredictions(predictions, finalizeData);
                    });
                }
            });
        } catch (e) {
            console.error(e);
        }
    };

    calculateUsability(function() {
    	res.send(data);
    });
};

exports.getRelativeUsability = function(req, res) {
    if (!req.query.projectId) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis2?projectId=42</tt>.'
        });
        return;
    }

    var avgFeatureValues = {};
    var correlations = {};
    var data = {
        A: { features: {}, usabilityItems: {} },
        B: { features: {} }
    };
    var output = '';
    var projectId = req.query.projectId;
    var relativeUsability = { metaInfo: { usersA: 0, usersB: 0 } };

    var getCorrelations = function(callback) {
        try {
            var mySqlConnection = require('../db').connect();

            /*
             * Fetch datasets from interface A from the DB.
             */
            mySqlConnection.query('SELECT * FROM wappu_features WHERE project_id = ? AND interface_version = \'A\'',
                    [projectId], function(err, rows) {
                if (err) {
                    console.error(err);
                }

                relativeUsability.metaInfo.usersA = rows.length;

                for (var i=0; i<rows.length; ++i) {
                    eval('var featureValues = ' + rows[i].features);
                    eval('var usabilityItems = ' + rows[i].usability_items);

                    processFeatureValues(featureValues, data.A.features);

                    for (var e in usabilityItems) {
                        if (!data.A.usabilityItems[e]) {
                            data.A.usabilityItems[e] = [];
                        }

                        data.A.usabilityItems[e].push(usabilityItems[e]);
                    }
                }

                for (var e in data.A.features) {
                    if (!avgFeatureValues[e]) {
                        avgFeatureValues[e] = { A: 0, Astdev: 0, B: 0, Bstdev: 0 };
                    }
                    
                    correlations[e] = {};

                    var tmpFeatureValues = [];

                    for (var i=0; i<data.A.features[e].length; ++i) {
                        if (!isNaN(data.A.features[e][i])) {
                            tmpFeatureValues.push(data.A.features[e][i]);
                            avgFeatureValues[e].A += data.A.features[e][i];
                        }
                    }

                    var dataset = stats(tmpFeatureValues);

                    avgFeatureValues[e].A /= tmpFeatureValues.length;
                    avgFeatureValues[e].Astdev = dataset.stdDev();

                    for (var f in data.A.usabilityItems) {
                        var tmpUsabilityItems = [];

                        for (var i=0; i<data.A.features[e].length; ++i) {
                            if (!isNaN(data.A.features[e][i])) {
                                tmpUsabilityItems.push(data.A.usabilityItems[f][i]);
                            }
                        }

                        correlations[e][f] = numbers.statistic.correlation(tmpFeatureValues, tmpUsabilityItems);

                        if (!correlations[e][f]) {
                            correlations[e][f] = 0;
                        }
                    }
                }

                callback();
            });
        } catch (e) {
            console.error(e);
        }
    };

    var getFeatureValuesForB = function(callback) {
        try {
            var mySqlConnection = require('../db').connect();

            /*
             * Fetch datasets from interface B from the DB.
             */
            mySqlConnection.query('SELECT * FROM wappu_features WHERE project_id = ? AND interface_version = \'B\'',
                    [projectId], function(err, rows) {
                if (err) {
                    console.error(err);
                }

                relativeUsability.metaInfo.usersB = rows.length;

                for (var i=0; i<rows.length; ++i) {
                    eval('var featureValues = ' + rows[i].features);

                    processFeatureValues(featureValues, data.B.features);
                }

                for (var e in data.B.features) {
                    if (!avgFeatureValues[e]) {
                        avgFeatureValues[e] = { A: 0, B: 0 };
                    }

                    avgFeatureValues[e].B = 0;

                    var tmpFeatureValues = [];

                    for (var i=0; i<data.B.features[e].length; ++i) {
                        if (!isNaN(data.B.features[e][i])) {
                            tmpFeatureValues.push(data.B.features[e][i]);
                            avgFeatureValues[e].B += data.B.features[e][i];
                        }
                    }

                    var dataset = stats(tmpFeatureValues);

                    avgFeatureValues[e].B /= tmpFeatureValues.length;
                    avgFeatureValues[e].Bstdev = dataset.stdDev();
                }

                callback();
            });
        } catch (e) {
            console.error(e);
        }
    };

    var prepareRelativeUsability = function(callback) {
        for (var e in global.vars.USABILITY_ITEMS) {
            relativeUsability[e] = [];
        }

        for (var e in avgFeatureValues) {
            for (var f in correlations[e]) {
                /*
                 * SET THRESHOLD FOR CONSIDERED CORRELATIONS HERE!
                 */
                if (Math.abs(correlations[e][f]) >= 0.3) {
                    if (avgFeatureValues[e].A != avgFeatureValues[e].B) {
                        var points = 0;

                        if (correlations[e][f] > 0) {
                            points = avgFeatureValues[e].A < avgFeatureValues[e].B ? +1 : -1;
                        } else if(correlations[e][f] < 0) {
                            points = avgFeatureValues[e].A < avgFeatureValues[e].B ? -1 : +1;
                        }

                        relativeUsability[f].push({
                            feature: e,
                            correlation: correlations[e][f],
                            valueA: avgFeatureValues[e].A,
                            stdevA: avgFeatureValues[e].Astdev,
                            valueB: avgFeatureValues[e].B,
                            stdevB: avgFeatureValues[e].Bstdev,
                            points: points
                        });
                    }
                }
            }
        }

        callback();
    };

    getCorrelations(function() {
        getFeatureValuesForB(function() {
            prepareRelativeUsability(function() {
                res.send(JSON.stringify(relativeUsability));
            });
        });
    });
};
