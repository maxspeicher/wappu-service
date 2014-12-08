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

/**
 * Save interaction tracking data to DB. If data comes from interface A, it also contains usability judgments and we
 * can incrementally train the usability item models.
 */
exports.saveData = function(req, res) {
    if (!(req.body.projectId && req.body.sessionId && req.body.userId && req.body.url && req.body.context
            && req.body.interfaceVersion && req.body.useRelativeFeatures && req.body.features
            && req.body.usabilityItems)) {
        res.send("{ error: 'incorrect parameters' }");
        return;
    }

    var data = req.body;
    data.useRelativeFeatures = data.useRelativeFeatures === "false" ? false : true;

    try {
        var mySqlConnection = require('../db').connect();
        var query = 'INSERT INTO wappu_features (project_id, session_id, user_id, url, context, context_hash, '
            + 'interface_version, features, usability_items) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE '
            + 'features = VALUES(features), usability_items = VALUES(usability_items)';

        mySqlConnection.query(query, [data.projectId, data.sessionId, data.userId, data.url, data.context,
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

    data.features = JSON.parse(data.features);
    data.usabilityItems = JSON.parse(data.usabilityItems);

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
            useRelativeFeatures: data.useRelativeFeatures,
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
                 * Record absolute and (optionally) relative values for each interaction feature.
                 */
                postData.featureNames += ((postData.featureNames ? ',' : '') + key + '_abs');
                postData.featureValues += ((postData.featureValues ? ',' : '') + data.features[e][f]);

                if (data.useRelativeFeatures) {
                    postData.featureNames += ((postData.featureNames ? ',' : '') + key + '_rel');
                    postData.featureValues += ((postData.featureValues ? ',' : '') + (data.features[e].total == 0 ? -1 :
                        data.features[e][f] / data.features[e].total));
                }
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

            console.log(postData);

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
                    res.send("{ response: 'success' }");
                }
            });
        };

        learnIncrementalClassifier(0);
    } else {
        /*
         * If the data does not contain answers to the Inuit usability questionnaire, we just need to collect it.
         */

        res.send("{ response: 'success' }");
    }
};

exports.analysis = function(req, res) {
    if (!req.query.projectId) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Missing Project ID',
            msg: 'Please append a project ID to the above URL, e.g. <tt>/wappu/analysis?projectId=42</tt>.'
        });
    } else if (!req.query.contextHash) {
        var projectId = req.query.projectId;
        var contextList = "<ul>";

        try {
            var mySqlConnection = require('../db').connect();

            mySqlConnection.query('SELECT context, context_hash, count(*) AS cnt, use_relative_features FROM '
                    + 'wappu_features INNER JOIN (SELECT DISTINCT project_id, context_hash, '
                    + 'use_relative_features FROM wappu_models) m USING(project_id, context_hash) WHERE project_id = ? '
                    + 'GROUP BY context, context_hash',
                    [projectId], function(err, rows) {
                if (err) {
                    console.error(err);
                }

                for (var i=0; i<rows.length; ++i) {
                    contextList += ("<li><a href='/wappu?projectId=" + projectId + "&contextHash="
                            + rows[i].context_hash + "&useRelativeFeatures=" + !!rows[i].use_relative_features + "'>"
                            + rows[i].context + "</a> (N = " + rows[i].cnt + ")</li>");
                }

                contextList += "</ul>";

                res.render('custom', {
                    title: 'WaPPU A/B Testing Project No. ' + projectId,
                    heading: 'Available contexts',
                    msg: contextList
                });
            });
        } catch (e) {
            console.error(e);
        }
    } else if (!req.query.useRelativeFeatures) {
        res.render('custom', {
            title: 'WaPPU A/B Testing Service: Error',
            heading: 'Have you enabled relative features?',
            msg: 'Please specify whether you have enabled relative features in this A/B testing project using the '
                    + '<tt>useRelativeFeatures</tt> parameter (<tt>true|false</tt>).'
        });
    } else {
        res.render('wappu/analysis', {
            title: 'WaPPU Analysis',
            interfaces: ['A', 'B'],
            projectId: req.query.projectId,
            contextHash: req.query.contextHash,
            useRelativeFeatures: req.query.useRelativeFeatures,
            usabilityItems: global.vars.USABILITY_ITEMS
        });
    }
};
