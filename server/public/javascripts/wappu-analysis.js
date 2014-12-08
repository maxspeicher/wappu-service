(function($) {

    var interfaces = ['A', 'B'];
    var usabilityValues = {};
    var expectedUsabilityValues = {};

    var USABILITY_MIN = 0;
    var USABILITY_MAX = +7;
    var USABILITY_STEP = 100 / (USABILITY_MAX - USABILITY_MIN);
    var ITEM_MIN = 0;
    var ITEM_MAX = +1;
    var ITEM_STEP = 100 / (ITEM_MAX - ITEM_MIN);

    var displayTrafficLight = function() {
        for (var i=0; i<interfaces.length; ++i) {
          if (!usabilityValues[interfaces[i]]) {
            return;
          }
        }

        $.ajax('/wappu/getSignificance', {
          data: {
            x: usabilityValues.A,
            y: usabilityValues.B
          },
          dataType: 'jsonp',
          type: 'POST',
          success: function(p) {
            var significant = false;
            var better = false;
        
            if (p > 0.05 || expectedUsabilityValues.B == expectedUsabilityValues.A) {
              significant = false;
            } else {
              significant = true;
            }
            
            if (expectedUsabilityValues.B < expectedUsabilityValues.A) {
              better = false;
            } else {
              better = true;
            }

            if (!significant) {
              SIO.drawTrafficLight('traffic-light', '#fff', 'yellow');
            } else {
              if (!better) {
                SIO.drawTrafficLight('traffic-light', '#fff', 'red');
              } else {
                SIO.drawTrafficLight('traffic-light', '#fff', 'green');
              }
            }
        
            $('#significance').html(
              'Interface <strong><q>B</q></strong> is <em>' +
              (significant ? '' : 'not ') +
              'significantly ' +
              (better ? 'better' : 'worse') +
              '</em> than interface <strong><q>A</q></strong>.'
            );
          }
        });
    };

    //$.each(interfaces, function(i, v) {
    var displayUsability = function(i) {
        var v = interfaces[i];

        $.getJSON('/wappu/getUsability', { projectId: projectId, contextHash: contextHash, interfaceVersion: v,
              useRelativeFeatures: useRelativeFeatures }, function(data) {
            usabilityValues[v] = data.usabilityValues.join(',');
            expectedUsabilityValues[v] = data.expectedUsability;

            $('#users' + v).html('<strong>' + data.usabilityValues.length + '</strong>');

            var expectedUsability = ((data.expectedUsability - USABILITY_MIN) * USABILITY_STEP);
            var usabilityStdev = (data.usabilityStdev * USABILITY_STEP);

            $('#usability' + v + '-value').html(expectedUsability.toPrecision(3) + '% <span class="stdev">&plusmn; '
                + usabilityStdev.toPrecision(3) + '%</span>');
            SIO.drawBar('usability' + v + '-bar', '#fff', expectedUsability, usabilityStdev);

            for (var e in data.inuitItems) {
                var expectedValue = (data.inuitItems[e].expectedValue - ITEM_MIN) * ITEM_STEP;
                var stdev = data.inuitItems[e].stdev * ITEM_STEP;

                $('#' + e + v + '-value').html(data.inuitItems[e].expectedValue.toFixed(1)
                    + ' <span class="stdev">&plusmn; ' + data.inuitItems[e].stdev.toFixed(1) + '</span>');
                SIO.drawBar(e + v + '-bar', '#fff', expectedValue, stdev);
            }

            if (i >= interfaces.length-1) {
                displayTrafficLight();
            } else {
              displayUsability(i+1);
            }
        });
    };
    //});

    displayUsability(0);

})(jQuery);
