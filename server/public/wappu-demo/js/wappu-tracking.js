var WaPPU = {
    data: {
        interactions: {}
    }
};

(function($) {

    var isEventWithinElement = function(e, selector) {
        return $(e.target).parents().andSelf().is(selector);
    };

    // shortcut for accessing the {I}nteraction features
    var _i = WaPPU.data.interactions;
    var trainingData = {};

    var getComponentsForFeatures = function(combinedFeatures) {
        var combinedElements = [];

        for (var i=0; i<combinedFeatures.length; ++i) {
            for (var f in _i[combinedFeatures[i]]) {
                if ($.inArray(f, combinedElements) === -1 && f !== 'total') {
                    combinedElements.push(f);
                }
            }
        }

        return combinedElements;
    };

    var getTextNodes = function(node) {
        var textNodes = [];
        
        if (node.nodeType === 3) {
            if (!(/^\s*$/.test(node.nodeValue))) {
                textNodes.push(node);
            }
        } else {
            for (var i=0; i<node.childNodes.length; ++i) {
                $.merge(textNodes, getTextNodes(node.childNodes[i]));
            }
        }
        
        return textNodes;
    };

    var registerClick = function(e) {
        _i.clicks.total++;

        for (var f in _i.clicks) {
            if (isEventWithinElement(e, f)) {
                _i.clicks[f]++;
            }
        }
    };

    var trackingActive = true;

    var track = {
        /*
         * features tracked: clicks
         */
        clicks: function() {
            $(document).bind('click', function(e) {
                if (!trackingActive) {
                    return;
                }

                registerClick(e);
            });
        },
        /*
         * features tracked: cursorMovementTime, cursorRangeX, cursorRangeY, cursorSpeed, cursorSpeedX, cursorSpeedY,
         *  cursorStops, cursorTrail, cursorTrailX, cursorTrailY
         */
        cursorInteractions: function() {
            var cursorPaused = true;
            var cursorPausedTimer = null;
            var maxCursorX = 0;
            var maxCursorY = 0;
            var minCursorX = Number.POSITIVE_INFINITY;
            var minCursorY = Number.POSITIVE_INFINITY;

            var combinedElements = getComponentsForFeatures(['cursorMovementTime', 'cursorSpeed', 'cursorSpeedX', 
                'cursorSpeedY', 'cursorStops', 'cursorTrail', 'cursorTrailX', 'cursorTrailY']);

            // these are for internal purposes
            var cursorTrails = {};
            var lastCoordinates = {};
            var lastCursorStart = { total: 0 };
            var movementTimes = {};

            var recordMovementTime = function(component, timestamp) {
                if (!movementTimes[component]) {
                    movementTimes[component] = 0;
                }

                movementTimes[component] += (timestamp - lastCursorStart[component]);

                if (component in _i.cursorMovementTime) {
                    _i.cursorMovementTime[component] = movementTimes[component];
                }
            };

            var recordSpeed = function(component) {
                if (component in _i.cursorSpeed) {
                    _i.cursorSpeed[component] = cursorTrails[component].total / movementTimes[component] * 1000;
                }

                if (component in _i.cursorSpeedX) {
                    _i.cursorSpeedX[component] = cursorTrails[component].x / movementTimes[component] * 1000;
                }

                if (component in _i.cursorSpeedY) {
                    _i.cursorSpeedY[component] = cursorTrails[component].y / movementTimes[component] * 1000;
                }
            };

            var recordTrail = function(component, x, y) {
                if (!(component in cursorTrails)) {
                    cursorTrails[component] = { total: 0, x: 0, y: 0 };
                }

                if (component in lastCoordinates) {
                    var cursorPathX = Math.abs(x - lastCoordinates[component].x);
                    var cursorPathY = Math.abs(y - lastCoordinates[component].y);
                    var cursorPath = Math.sqrt(cursorPathX + cursorPathY);

                    cursorTrails[component].total += cursorPath;
                    cursorTrails[component].x += cursorPathX;
                    cursorTrails[component].y += cursorPathY;

                    if (component in _i.cursorTrail) {
                        _i.cursorTrail[component] = cursorTrails[component].total;
                    }

                    if (component in _i.cursorTrailX) {
                        _i.cursorTrailX[component] = cursorTrails[component].x;
                    }

                    if (component in _i.cursorTrailY) {
                        _i.cursorTrailY[component] = cursorTrails[component].y;
                    }
                }

                lastCoordinates[component] = { x: x, y: y };
            };

            $(document).bind('mousemove', function(e) {
                if (!trackingActive) {
                    return;
                }

                var x = e.clientX;
                var y = e.clientY;

                if (x < minCursorX) {
                    minCursorX = x;
                }

                if (x > maxCursorX) {
                    maxCursorX = x;
                }

                if (y < minCursorY) {
                    minCursorY = y;
                }

                if (y > maxCursorY) {
                    maxCursorY = y;
                }

                // cursor range
                _i.cursorRangeX.total = maxCursorX - minCursorX;
                _i.cursorRangeY.total = maxCursorY - minCursorY;

                // cursor trail
                recordTrail('total', x, y);

                $.each(combinedElements, function(i, f) {
                    if (isEventWithinElement(e, f)) {
                        recordTrail(f, x, y);
                    }
                });

                if (!cursorPaused) {
                    window.clearTimeout(cursorPausedTimer);

                    cursorPausedTimer = window.setTimeout(function() {
                        var t = $.WaPPUUtils.ts() - 1000;

                        // cursor stops
                        _i.cursorStops.total++;

                        for (var f in _i.cursorStops) {
                            if (isEventWithinElement(e, f)) {
                                _i.cursorStops[f]++;
                            }
                        }

                        // cursor movement time + cursor speed
                        _i.cursorMovementTime.total += (t - lastCursorStart.total);

                        _i.cursorSpeed.total = _i.cursorTrail.total / _i.cursorMovementTime.total * 1000;
                        _i.cursorSpeedX.total = _i.cursorTrailX.total / _i.cursorMovementTime.total * 1000;
                        _i.cursorSpeedY.total = _i.cursorTrailY.total / _i.cursorMovementTime.total * 1000;

                        $.each(combinedElements, function(i, f) {
                            if (isEventWithinElement(e, f)) {
                                recordMovementTime(f, t);
                                recordSpeed(f);
                            }
                        });

                        cursorPaused = true;
                    }, 1000);
                } else {
                    var t = $.WaPPUUtils.ts();

                    lastCursorStart.total = t;

                    $.each(combinedElements, function(i, f) {
                        if (isEventWithinElement(e, f)) {
                            lastCursorStart[f] = t;
                        }
                    });

                    cursorPaused = false;
                }
            });

            $.each(combinedElements, function(i, f) {
                $(f).bind('mouseenter', function(e) {
                    if (!trackingActive) {
                        return;
                    }

                    var t = $.WaPPUUtils.ts();
                    lastCursorStart[f] = t;

                    recordTrail(f, e.clientX, e.clientY);
                });

                // if a component is left, the respective features need to be updated even if the cursor does not pause
                $(f).bind('mouseleave', function(e) {
                    if (!trackingActive) {
                        return;
                    }

                    var t = $.WaPPUUtils.ts();

                    recordMovementTime(f, t);
                    recordTrail(f, e.clientX, e.clientY);
                    recordSpeed(f);
                });
            });
        },
        /*
         * features tracked: inputFocusAmount
         */
        inputFocusAmount: function() {
            $('input').bind('focus', function(e) {
                if (!trackingActive) {
                    return;
                }

                _i.inputFocusAmount.total++;

                for (var f in _i.inputFocusAmount) {
                    if (isEventWithinElement(e, f)) {
                        _i.inputFocusAmount[f]++;
                    }
                }
            });
        },
        /*
         * features tracked: arrivalTime, hovers, hoverTime, maxHoverTime
         */
        hovers: function() {
            var arrivalTimes = {};
            var start = $.WaPPUUtils.ts();

            var _mouseenter = function(/*e*/) {
                if (!trackingActive) {
                    return;
                }

                var current = $.WaPPUUtils.ts();

                if (!arrivalTimes[f]) {
                    arrivalTimes[f] = current - start;
                    _i.arrivalTime[f] = arrivalTimes[f];
                }
            };

            for (var f in _i.arrivalTime) {
                $(f).bind('mouseenter', _mouseenter);
            }

            var combinedElements = getComponentsForFeatures(['hovers', 'hoverTime', 'maxHoverTime']);

            // these are for internal purposes
            var hovers = { total: 0 };
            var hoverTimes = { total: 0 };
            var startTimes = {};

            $.each(combinedElements, function(i, f) {
                $(f).bind('mouseenter', function(/*e*/) {
                    if (!trackingActive) {
                        return;
                    }

                    if (!hovers[f]) {
                        hovers[f] = 0;
                    }

                    hovers[f]++;
                    hovers.total++;

                    // record actual feature for components that shall be tracked
                    if (f in _i.hovers) {
                        _i.hovers[f]++;
                        _i.hovers.total++;
                    }

                    startTimes[f] = $.WaPPUUtils.ts();
                });

                $(f).bind('mouseleave', function(/*e*/) {
                    if (!trackingActive) {
                        return;
                    }

                    if (!hoverTimes[f]) {
                        hoverTimes[f] = 0;
                    }

                    var t = $.WaPPUUtils.ts() - startTimes[f];

                    hoverTimes[f] += t;
                    hoverTimes.total += t;

                    // record actual features for components that shall be tracked

                    if (f in _i.hoverTime) {
                        _i.hoverTime[f] = hoverTimes[f] / hovers[f];
                        _i.hoverTime.total = hoverTimes.total / hovers.total;
                    }

                    if (f in _i.maxHoverTime) {
                        if (t > _i.maxHoverTime[f]) {
                            _i.maxHoverTime[f] = t;
                        }

                        if (t > _i.maxHoverTime.total) {
                            _i.maxHoverTime.total = t;
                        }
                    }
                });
            });
        },
        /*
         * features tracked: hoversPrevHoveredText, multiplyHoveredText
         * based on: Navalpakkam & Churchill: "Mouse Tracking: Measuring and Predicting Users’ Experience of Web-based
         *  Content" (CHI 2012)
         */
        hoversPrevHovered: function() {
            var $this, $textSpan, hovers;

            // prepare text nodes
            $(getTextNodes(document.getElementsByTagName('body')[0])).each(function() {
                $this = $(this);
                $textSpan = $('<span class="wappu-text"></span>');

                if (!$this.parent().is(':visible')) {
                    return;
                }

                $this.after($textSpan);
                $textSpan.append($this);
            });

            $('.wappu-text').bind('mouseenter', function(e) {
                if (!trackingActive) {
                    return;
                }

                $this = $(this);
                hovers = $this.data('prevHovered') || 0;

                if (hovers > 0) {
                    _i.hoversPrevHoveredText.total++;

                    for (var f in _i.hoversPrevHoveredText) {
                        if (isEventWithinElement(e, f)) {
                            _i.hoversPrevHoveredText[f]++;
                        }
                    }
                }

                if (hovers === 1) {
                    _i.multiplyHoveredText.total++;

                    for (var g in _i.multiplyHoveredText) {
                        if (isEventWithinElement(e, g)) {
                            _i.multiplyHoveredText[g]++;
                        }
                    }
                }

                $this.data('prevHovered', hovers+1);
            });
        },
        /*
         * features tracked: charsTyped, charsDeleted
         */
        inputChars: function() {
            $('input').bind('keyup blur', function(e) {
                if (!trackingActive) {
                    return;
                }

                var $this = $(e.target);
                var lastLength = $this.data('lastLength') || 0;
                var length = $this.val().length;
                
                if (length > lastLength) {
                    _i.charsTyped.total += (length - lastLength);
                } else {
                    _i.charsDeleted.total += (lastLength - length);
                }

                for (var f in _i.charsTyped) {
                    if (isEventWithinElement(e, f)) {
                        if (length > lastLength) {
                            _i.charsTyped[f] += (length - lastLength);
                        }
                    }
                }

                for (f in _i.charsDeleted) {
                    if (isEventWithinElement(e, f)) {
                        if (length < lastLength) {
                            _i.charsDeleted[f] += (lastLength - length);
                        }
                    }
                }
                
                $this.data('lastLength', length);
            });
        },
        /*
         * features tracked: pageDwellTime
         */
        pageDwellTime: function() {
            window.setInterval(function() {
                if (!trackingActive) {
                    return;
                }

                _i.pageDwellTime.total += 1000;
                _i.arrivalTime.total = _i.pageDwellTime.total;
            }, 1000);
        },
        /*
         * features tracked: scrollingDirectionChanges, scrollingMaxY, scrollingPixelAmount, scrollingSpeed
         */
        scrolling: function() {
            _i.scrollingMaxY.total = $(window).scrollTop();

            var currentDirection = 0;
            var currentScrollTop = _i.scrollingMaxY.total;
            var newDirection;
            var newScrollTop;

            $(window).bind('scroll', function() {
                if (!trackingActive) {
                    return;
                }

                newScrollTop = $(window).scrollTop();
                newDirection = newScrollTop > currentScrollTop ? +1 : -1;

                if (newDirection !== currentDirection) {
                    _i.scrollingDirectionChanges.total++;
                    currentDirection = newDirection;
                }

                if (newScrollTop > _i.scrollingMaxY.total) {
                    _i.scrollingMaxY.total = newScrollTop;
                }

                _i.scrollingPixelAmount.total += Math.abs(newScrollTop - currentScrollTop);
                _i.scrollingSpeed.total = _i.scrollingPixelAmount.total / _i.pageDwellTime.total;

                currentScrollTop = newScrollTop;
            });
        },
        /*
         * features tracked: textSelections, textSelectionLength
         */
        textSelection: function() {
            var lastText = '';

            $(document).bind('mouseup', function(e) {
                if (!trackingActive) {
                    return;
                }

                var text = '';
                
                if (window.getSelection) {
                    text = window.getSelection().toString();
                } else if (document.getSelection) {
                    text = document.getSelection().toString();
                } else if (document.selection) {
                    text = document.selection.createRange().text;
                }

                // if a piece of text is unselected by clicking somewhere, var text still contains the selected text
                // => check whether selection has changed
                if (text && text !== lastText) {
                    _i.textSelections.total++;
                    _i.textSelectionLength.total += text.length;

                    for (var f in _i.textSelections) {
                        if (isEventWithinElement(e, f)) {
                            _i.textSelections[f]++;
                        }
                    }

                    for (f in _i.textSelectionLength) {
                        if (isEventWithinElement(e, f)) {
                            _i.textSelectionLength[f] += text.length;
                        }
                    }
                }

                lastText = text;
            });
        }
    };

    var features = ['arrivalTime', 'charsDeleted', 'charsTyped', 'clicks', 'cursorMovementTime', 'cursorRangeX',
       'cursorRangeY', 'cursorSpeed', 'cursorSpeedX', 'cursorSpeedY', 'cursorStops', 'cursorTrail', 'cursorTrailX',
       'cursorTrailY', 'hovers', 'hoversPrevHoveredText', 'hoverTime', 'inputFocusAmount', 'maxHoverTime',
       'multiplyHoveredText', 'pageDwellTime', 'scrollingDirectionChanges', 'scrollingMaxY', 'scrollingPixelAmount',
       'scrollingSpeed', 'textSelections', 'textSelectionLength'];

    for (var i=0; i<features.length; ++i) {
        _i[features[i]] = { total: 0 };
    }

    WaPPU.saveData = function(args) {
        var callback;
        var usabilityItems = {};

        if (args) {
            if (args.callback) {
                callback = args.callback;
            }

            if (args.usabilityItems) {
                usabilityItems = args.usabilityItems;
            }
        }

        $.WaPPUUtils.postData({
            projectId: WaPPU.options.projectId,
            /*
             * The user ID is unique across several webpages. It does not need to be set, but we need it for internal
             * purposes, i.e., for aggregating results from WaPPU and Piwik.
             */
            userId: WaPPU.options.userId || '-1',

            // This session ID is unique for a single webpage only, i.e., a new page load triggers a new ID.
            sessionId: WaPPU.sessionId,

            // user context
            context: JSON.stringify(WaPPU.options.context),

            url: location.href,
            interfaceVersion: WaPPU.options.interfaceVersion,
            useRelativeFeatures: WaPPU.options.useRelativeFeatures === false ? false : true,
            features: JSON.stringify(trainingData),
            usabilityItems: JSON.stringify(usabilityItems)
        }, callback);
    };

    WaPPU.stop = function() {
        trackingActive = false;
    };

    WaPPU.resume = function() {
        trackingActive = true;
    };

    WaPPU.init = function(components, pageFeatures, questionnaireEnabled) {
        for (var e in components) {
            for (var i=0; i<components[e].length; ++i) {
                if (!trainingData[components[e][i]]) {
                    /*
                     * _i contains values for all features, but only the ones defined by the developer will be
                     * transmitted as trainingData.
                     */
                    trainingData[components[e][i]] = _i[components[e][i]];
                }

                _i[components[e][i]][e] = 0;
            }
        }

        if (pageFeatures) {
            for (var i=0; i<pageFeatures.length; ++i) {
                if (!trainingData[pageFeatures[i]]) {
                    trainingData[pageFeatures[i]] = _i[pageFeatures[i]];
                }
            }
        }

        for (var f in track) {
           track[f]();
        }

        if (!questionnaireEnabled) {
            window.setInterval(WaPPU.saveData, 2000);
            $(window).unload(WaPPU.saveData);

            var $this, href;

            $('a:not([href^="javascript:"], [href^="#"])').each(function() {
                $this = $(this);
                href = $this.attr('href');

                $this
                    .bind('click', function() {
                        WaPPU.saveData({
                            callback: function() {
                                location.href = href;
                            }
                        });
                    })
                    .attr('href', '#');
            });
        }
    };

    WaPPU.start = function(options, components, pageFeatures) {
        WaPPU.options = options;

        if (WaPPU.options.useDefaultContext === false) {
            WaPPU.options.context = {};
        } else {
            var isBlockingAds = (document.getElementById('wappu-advertisement') === null);
            var screenCtx = 'small';

            if (screen.width * screen.height >= 1024 * 768) {
                screenCtx = 'standard';
            }

            if (screen.width * screen.height >= 1364 * 768) {
                screenCtx = 'HD';
            }

            if (screen.width * screen.height >= 1920 * 1080) {
                screenCtx = 'fullHD';
            }

            WaPPU.options.context = { adBlock: isBlockingAds, screenCtx: screenCtx };
        }

        if (options.additionalContext) {
            for (var e in options.additionalContext) {
                WaPPU.options.context[e] = options.additionalContext[e];
            }
        }

        var isMobileDevice = $.MobileEsp.DetectTierTablet() || $.MobileEsp.DetectTierIphone() || $.MobileEsp.DetectTierOtherPhones();

        // Filter out mobile devices since WaPPU does not (yet) support touch events.
        if (isMobileDevice) {
            return;
        }

        WaPPU.sessionId = $.WaPPUUtils.ts();

        if (options.provideQuestionnaire) {
            WaPPU.init(components, pageFeatures, true);
        } else {
            WaPPU.init(components, pageFeatures);
        }
    };

})(jQuery);
