var global = require('../globals');
var md5 = require('MD5');
var stats = require('statsjs');

var httpPost = global.fn.httpPost;
var mlUtils = global.vars.ML_UTILS;

exports.index = function(req, res) {
    res.render('wappu/index', {
        title: 'WaPPU A/B Testing Service'
    });
};

exports.getFeatures = function(req, res) {
    var q = req.query.q;

    /*
     * Features that have been commented out are whole page features that are tracked by default and need not be
     * added to individual components.
     */
    var features = {
        'arrival time': 'arrivalTime',
        '# deleted characters': 'charsDeleted',
        '# typed characters': 'charsTyped',
        '# clicks': 'clicks',
        'cursor movement time': 'cursorMovementTime',
        //'cursor range X': 'cursorRangeX',
        //'cursor range Y': 'cursorRangeY',
        'cursor speed': 'cursorSpeed',
        'cursor speed (X-axis)': 'cursorSpeedX',
        'cursor speed (Y-axis)': 'cursorSpeedY',
        '# cursor stops': 'cursorStops',
        'length of cursor trail': 'cursorTrail',
        'length of cursor trail (X-axis)': 'cursorTrailX',
        'length of cursor trail (Y-axis)': 'cursorTrailY',
        '# hovers': 'hovers',
        '# hovers over previously hovered text elements': 'hoversPrevHoveredText',
        'hover time': 'hoverTime',
        '# focus events on input fields': 'inputFocusAmount',
        'maximum hover time': 'maxHoverTime',
        '# multiply hovered text elements': 'multiplyHoveredText',
        //'page dwell time': 'pageDwellTime',
        //'# scrolling direction changes': 'scrollingDirectionChanges',
        //'maximum scrolling offset': 'scrollingMaxY',
        //'# pixels scrolled': 'scrollingPixelAmount',
        //'scrolling speed': 'scrollingSpeed',
        '# text selections': 'textSelections',
        'length of text selections': 'textSelectionLength'
    };

    var results = [];
    var i = 0;

    for (var f in features) {
        if (f.indexOf(q) > -1) {
            results.push({ id: features[f], name: f });
        }

        ++i;
    }

    res.send(JSON.stringify(results));
};

/**
 * Save a questionnaire to the DB.
 */
exports.saveQuestionnaire = function(req, res) {
    if (!req.body.userId) {
        res.send('error');
        return;
    }

    var data = req.body;

    if (!data.feedback) {
        data.feedback = '';
    }

    if (data.internet_topics.toString() !== '[object Array]') {
        data.internet_topics = [data.internet_topics];
    }

    if (data.search_engine_queries.toString() !== '[object Array]') {
        data.search_engine_queries = [data.search_engine_queries];
    }

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_questionnaire (user_id, internet_time, internet_topics, search_engine, '
                + 'search_engine_use, search_engine_queries, date_birth, gender, feedback) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) '
                + 'ON DUPLICATE KEY UPDATE internet_time = VALUES(internet_time) AND internet_topics = VALUES(internet_topics) '
                + 'AND search_engine = VALUES(search_engine) AND search_engine_use = VALUES(search_engine_use) '
                + 'AND search_engine_queries = VALUES(search_engine_queries) AND date_birth = VALUES(date_birth) '
                + 'AND gender = VALUES(gender) AND feedback = VALUES(feedback)';

        mySqlConnection.query(query, [data.userId, data.internet_time, data.internet_topics.join(','),
                data.search_engine, data.search_engine_use, data.search_engine_queries.join(','), data.date_birth,
                data.gender, data.feedback], function(err, rows, fields) {
            if (err) {
                console.error(err);
                res.send(err);

                return;
            }

            res.send('success');
          });

        mySqlConnection.end();
    } catch (e) {
        console.error(e);
    }
};

/**
 * Save a user intention to the DB.
 */
exports.saveIntention = function(req, res) {
    if (!(req.body.userId && req.body.intention)) {
        res.send('');
        return;
    }

    var data = req.body;

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_intention (user_id, intention) VALUES (?, ?) ON '
                + 'DUPLICATE KEY UPDATE intention = VALUES(intention)';

        mySqlConnection.query(query, [data.userId, data.intention],
            function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.send(err);

                    return;
                }

                res.send('success');
            }
        );

        mySqlConnection.end();
    } catch (e) {
        console.error(e);
    }
};

/**
 * Save a study participant to the DB.
 */
exports.saveParticipant = function(req, res) {
    if (!(req.body.userId && req.body.division && req.body.userAgentString)) {
        res.send('');
        return;
    }

    var data = req.body;

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_participant (user_id, name, division, user_agent) VALUES (?, ?, ?, ?) ON '
                + 'DUPLICATE KEY UPDATE name = VALUES(name) AND division = VALUES(division) AND user_agent = '
                + 'VALUES(user_agent)';

        mySqlConnection.query(query, [data.userId, data.name, data.division, data.userAgentString],
            function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.send(err);

                    return;
                }

                res.send('success');
            }
        );

        mySqlConnection.end();
    } catch (e) {
        console.error(e);
    }
};

/**
 * Save an A/B testing project to the DB.
 */
exports.saveProject = function(req, res) {
    if (!(req.body.projectId && req.body.name && req.body.pw)) {
        res.send('');
        return;
    }

    var data = req.body;

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_project (project_id, name, pw) VALUES (?, ?, ?)';

        mySqlConnection.query(query, [data.projectId, data.name, data.pw], function(err, rows, fields) {
            if (err) {
                console.error(err);
                res.send(err);

                return;
            }

            res.send('success');
          });

        mySqlConnection.end();
    } catch (e) {
        console.error(e);
    }
};

/**
 * Save interaction tracking data to DB. If data comes from interface A, it also contains usability judgments and we
 * can incrementally train the usability item models.
 */
exports.saveData = function(req, res) {
    if (!(req.body.projectId && req.body.sessionId && req.body.userId && req.body.serpUrl && req.body.context
            && req.body.interfaceVersion && req.body.features && req.body.usabilityItems)) {
        res.send('incorrect parameters');
        return;
    }

    var data = req.body;

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_features (project_id, session_id, user_id, serp_url, context, context_hash, '
            + 'interface_version, features, usability_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE '
            + 'features = VALUES(features), usability_items = VALUES(usability_items)';

        mySqlConnection.query(query, [data.projectId, data.sessionId, data.userId, data.serpUrl, data.context,
                md5(data.context), data.interfaceVersion, data.features, data.usabilityItems],
            function(err, rows, fields) {
                if (err) {
                    console.error(err);
                    res.send(err);
                }
            }
        );

        mySqlConnection.end();
    } catch (e) {
        console.error(e);
    }

    /*
     * data.features and data.usabilityItems are passed in as JSON strings that are, however, not properly stringified.
     * Thus, use eval instead of JSON.parse.
     */
    eval('data.features = ' + data.features);
    eval('data.usabilityItems = ' + data.usabilityItems);

    /*
     * If the data contains answers to the Inuit usability questionnaire, we use these training data
     * for incrementally updating the model for each Inuit usability item. This happens independent of the interface
     * version since it is possible (but not necessary) to train models for both interfaces in the A/B test.
     */
    if ('informativeness' in data.usabilityItems) {
        var postData = {
            projectId: data.projectId,
            context: data.context,
            contextHash: md5(data.context),
            interfaceVersion: data.interfaceVersion,
            classifier: global.vars.WAPPU_CLASSIFIER,
            itemName: '',
            itemValues: '',
            featureNames: '',
            featureValues: ''
        };

        // e = feature name (e.g., clicks)
        for (var e in data.features) {
            // f = component name (e.g., #navbar)
            for (var f in data.features[e]) {
                if (f == 'total') {
                    continue;
                }

                // Features are calculated on a per-component basis.
                var key = e + '_' + f;

                /*
                 * Record absolute as well as relative values for each interaction feature.
                 */
                // postData.featureNames += ((postData.featureNames ? ',' : '') + key + '_abs');
                // postData.featureValues += ((postData.featureValues ? ',' : '') + data.features[e][f]);

                postData.featureNames += ((postData.featureNames ? ',' : '') + key + '_rel');
                postData.featureValues += ((postData.featureValues ? ',' : '') + (data.features[e].total == 0 ? 0 :
                    data.features[e][f] / data.features[e].total));
            }
        }

        var usabilityItems = [];

        for (var e in data.usabilityItems) {
            usabilityItems.push({
                name: e,
                value: data.usabilityItems[e] + ''
            });
        }

        var learnIncrementalClassifier = function(i) {
            postData.itemName = usabilityItems[i].name;
            postData.itemValues = usabilityItems[i].value;

            /*
             * The postData passed to the API is of the form
             *
             * {
             *   itemName: 'itemToBeTrained',
             *   itemValues: '1,0,42',
             *   featureNames: 'clicks,hovers',
             *   featureValues: '1,2,3,1,2,3'
             * }
             */
            httpPost(mlUtils.host, mlUtils.port + '', mlUtils.path + '/classifier/train', postData, function(output) {
                if (i < usabilityItems.length - 1) {
                    learnIncrementalClassifier(i+1);
                } else {
                    res.send('success');
                }
            });
        };

        learnIncrementalClassifier(0);
    } else {
        /*
         * If the data does not contain answers to the Inuit usability questionnaire, we just need to collect it.
         */

        res.send('success');
    }
};

/**
 * @param data Data points for performing the linear regression, e.g., {usability: '1,2,3', clicks_rel: '2,3,4',
 *   clicks_abs: '3,4,5'}. One variable should not contain an underscore and is the target variable.
 * @returns A function that represents the regression formula. The same data object as above can be passed to this
 *   function.
 */
var linearRegression = function(data, callback) {
    httpPost(mlUtils.host, mlUtils.port + '', '/multiple-linear-regression', data, function(output) {
        eval('var obj = ' + output);
        eval('var regressionFormula = function(data) { return ' + obj.model.split('=')[1] + '; }');

        callback(regressionFormula, obj.correlationCoefficient);
      });
};

exports.analysis = function(req, res) {
    if (!req.query.projectId) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis?projectId=42</tt>.'
        });

        return;
    }

    res.render('wappu/analysis_new', {
        title: 'WaPPU Analysis',
        interfaces: ['A', 'B'],
        projectId: req.query.projectId,
        usabilityItems: global.vars.USABILITY_ITEMS
    });
};

exports.analysis2 = function(req, res) {
    if (!req.query.projectId) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis2?projectId=42</tt>.'
        });

        return;
    }

    res.render('wappu/analysis2', {
        title: 'WaPPU Analysis',
        interfaces: ['A', 'B'],
        projectId: req.query.projectId,
        usabilityItems: global.vars.USABILITY_ITEMS
    });
};

/**
 * The admin panel. If this function is called, usability item values are predicted for each dataset (=user) from
 * interface B with the current states of the incremental usability item models.
 */
exports.analysisOld = function(req, res) {
    if (!req.query.projectId) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis?projectId=42</tt>.'
        });

        return;
    }

    var projectId = req.query.projectId;

    /*
     * This object saves the collected (interface A) and predicted (interface B) values for each Inuit usability item
     * as well as an overall expected usability value + standard deviation. This will be fed into the Jade view for the
     * admin panel.
     */
    var data = {
        A: {
            usabilityValues: [],
            expectedUsability: 0,
            usabilityStdev: 0,
            inuitItems: {}
        },
        B: {
            usabilityValues: [],
            expectedUsability: 0,
            usabilityStdev: 0,
            inuitItems: {}
        }
    };

    /**
     * Interface A: Take the questionnaire answers and calculate the according usability item values as well as a mean
     * usability value + standard deviation.
     */
    var calculateUsabilityForA = function(callback) {
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

                for (var i=0; i<rows.length; ++i) {
                    eval('var usabilityItems = ' + rows[i].usability_items);

                    var usabilityValue = 0;

                    for (var e in usabilityItems) {
                        // classValue \in {-1,0,+1}
                        var classValue = usabilityItems[e];

                        if (!data.A.inuitItems[e]) {
                            data.A.inuitItems[e] = {
                                aggregatedProbabilities: [0, 0, 0],
                                avgProbabilities: [0, 0, 0],
                                expectedValue: 0,
                                stdev: 0,
                                instances: 0
                            };
                        }

                        data.A.inuitItems[e].aggregatedProbabilities[classValue+1]++;
                        data.A.inuitItems[e].instances++;

                        // The sum of all Inuit item ratings is the overall usability value (\in [-7,7]).
                        usabilityValue += classValue;
                    }

                    data.A.usabilityValues.push(usabilityValue);
                }

                for (var e in data.A.inuitItems) {
                    var item = data.A.inuitItems[e];

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

                var dataset = stats(data.A.usabilityValues);

                /*
                 * Calculate expected value and stDev of overall usability using statsjs.
                 */
                data.A.expectedUsability = dataset.mean();
                data.A.usabilityStdev = dataset.stdDev();

                callback();
            });
        } catch (e) {
            console.error(e);
        }
    };

    /**
     * Interface B: Take the tracked interactions and predict values for each Inuit usability item as well as an
     * overall usability value.
     */
    var calculateUsabilityForB = function(callback) {
        var postData = {
            projectId: projectId,
            classifier: global.vars.WAPPU_CLASSIFIER,
            itemName: '',
            featureNames: '',
            featureValues: ''
        };

        var featureValues = {};

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

                for (var i=0; i<rows.length; ++i) {
                    eval('var features = ' + rows[i].features);

                    // e = feature name (e.g., clicks)
                    for (var e in features) {
                        // f = component name (e.g., #navbar)
                        for (var f in features[e]) {
                            if (f == 'total') {
                                continue;
                            }

                            // Features are calculated on a per-component basis.
                            var key = e + '_' + f;

                            /*
                             * Record absolute as well as relative values for each interaction feature.
                             */
                            if (typeof featureValues[key + '_abs'] == 'undefined') {
                                featureValues[key + '_abs'] = features[e][f];
                            } else {
                                featureValues[key + '_abs'] += (',' + features[e][f]);
                            }

                            if (typeof featureValues[key + '_rel'] == 'undefined') {
                                featureValues[key + '_rel'] = (features[e].total == 0 ? -1 : features[e][f] / features[e].total);
                            } else {
                                featureValues[key + '_rel'] += (',' + (features[e].total == 0 ? -1 : features[e][f] / features[e].total));
                            }
                        }
                    }
                }

                /*
                 * Prepare postData in the same way as required for the /classifier/train API request (see above).
                 */
                for (var e in featureValues) {
                    postData.featureNames += ((postData.featureNames ? ',' : '') + e);
                    postData.featureValues += ((postData.featureValues ? ',' : '') + featureValues[e]);
                }

                // TODO: export this to a global variable.
                var usabilityItems = ['informativeness', 'understandability', 'confusion', 'distraction', 'readability',
                    'infDensity', 'accessibility'];
                var predictions = {};

                var predictUsabilityItems = function(i) {
                    // Contrary to /classifier/train, itemValues does not need to be set.
                    postData.itemName = usabilityItems[i];

                    httpPost(mlUtils.host, mlUtils.port + '', '/classifier/predict', postData, function(output) {
                        /*
                         * The API returns an array of objects
                         * { votesForInstance: [...], normalizedVotesForInstance: [...] }
                         * which are equivalent to aggregatedProbabilities and avgProbabilites computed for interface A,
                         * i.e., sum(votesForInstance) != 1; sum(normalizedVotesForInstance) = 1.
                         */
                        var arrayOfPredictions = JSON.parse(output);

                        if (i < usabilityItems.length) {
                            predictions[usabilityItems[i]] = arrayOfPredictions;
                            predictUsabilityItems(i+1);
                        } else {
                            callback(predictions);
                        }
                    });
                };

                if (postData.featureNames) {
                    // data for interface B available
                    predictUsabilityItems(0);
                } else {
                    // no data/predicitons available => predictions = {}
                    callback({});
                }
            });
        } catch (e) {
            console.error(e);
        }
    };

    /*
     * First, calculate usability for interface A, then predict usability values for interface B and use the predictions
     * for populating the data object.
     */
    calculateUsabilityForA(function() {
        calculateUsabilityForB(function(predictions) {
            var usabilityValues = [];

            for (var e in predictions) {
                var instances = predictions[e];

                for (var i=0; i<instances.length; ++i) {
                    var classValue = 0;

                    // classValue \n [-1,+1]
                    for (var j=0; j<instances[i].votesForInstance.length; ++j) {
                        classValue += ((j-1) * instances[i].normalizedVotesForInstance[j]);
                    }

                    if (!data.B.inuitItems[e]) {
                        data.B.inuitItems[e] = {
                            aggregatedProbabilities: [0, 0, 0],
                            avgProbabilities: [0, 0, 0],
                            expectedValue: 0,
                            stdev: 0,
                            instances: 0
                        };
                    }

                    // Aggregate the normalized votes for instance.
                    for (var j=0; j<instances[i].votesForInstance.length; ++j) {
                        data.B.inuitItems[e].aggregatedProbabilities[j] += instances[i].normalizedVotesForInstance[j];
                    }

                    data.B.inuitItems[e].instances++;

                    if (!usabilityValues[i]) {
                        usabilityValues[i] = 0;
                    }

                    // The sum of all Inuit item predictions is the overall usability value (\in [-7,7]).
                    usabilityValues[i] += classValue;
                }
            }

            data.B.usabilityValues = usabilityValues;

            for (var e in data.B.inuitItems) {
                var item = data.B.inuitItems[e];

                if (!item.instances) {
                    continue;
                }
                
                /*
                 * Calculate avg. probabilities (sum = 1) from aggregated probabilities (sum != 1).
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

            var dataset = stats(data.B.usabilityValues);

            /*
             * Calculate expected value and stDev of overall usability using statsjs.
             */
            data.B.expectedUsability = dataset.mean();
            data.B.usabilityStdev = dataset.stdDev();

            res.render('wappu/analysis', {
                title: 'WaPPU Analysis',
                data: data
            });
        });
    });
};

// exports.analysisOld = function(req, res) {
//     if (!req.query.projectId) {
//         return;
//     }

//     var output = '';
//     var projectId = req.query.projectId;

//     try {
//         var mySqlConnection = require('../db').connect();

//         mySqlConnection.query('SELECT * FROM wappu_features WHERE project_id = ?', [projectId], function(err, rows) {
//             if (err) {
//                 console.error(err);
//             }

//             var data = {};
//             var dataKeys = [];

//             for (var i=0; i<rows.length; ++i) {
//                 eval('var obj = ' + rows[i].features);

//                 for (var e in obj.inuit) {
//                     if (!data[e]) {
//                         data[e] = {};
//                         data[e][e] = '';
//                         dataKeys.push(e);
//                     }

//                     data[e][e] += ((data[e][e] ? ',' : '') + obj.inuit[e]);
//                 }

//                 for (var e in obj.features) {
//                     for (var f in obj.features[e]) {
//                         if (f == 'total') {
//                             continue;
//                         }

//                         var key = e + '_' + f;

//                         for (var g in data) {
//                             if (!data[g][key]) {
//                                 data[g][key] = '';
//                             }

//                             data[g][key] += ((data[g][key] ? ',' : '')
//                                 + (obj.features[e].total == 0 ? 0 : obj.features[e][f] / obj.features[e].total));
//                         }
//                     }
//                 }
//             }

//             var getRegressionFormula = function(i) {
//                 linearRegression(data[dataKeys[i]], function(regressionFormula, correlationCoefficient) {
//                     data[dataKeys[i]].linearRegression = regressionFormula;
//                     data[dataKeys[i]].correlationCoefficient = correlationCoefficient;

//                     if (i < dataKeys.length-1) {
//                         getRegressionFormula(i+1);
//                     } else {
//                         res.send(JSON.stringify(data));
//                         mySqlConnection.end();
//                     }
//                 });
//             };

//             getRegressionFormula(0);
//         });
//     } catch (e) {
//         console.error(e);
//     }
// };
