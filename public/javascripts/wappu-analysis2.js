(function($) {

    var USABILITY_MIN = -7;
    var USABILITY_MAX = +7;
    var USABILITY_STEP = 100 / (USABILITY_MAX - USABILITY_MIN);
    var ITEM_MIN = -1;
    var ITEM_MAX = +1;
    var ITEM_STEP = 100 / (ITEM_MAX - ITEM_MIN);

    var USABILITY_ITEMS = {
        informativeness: "Informativeness",
        understandability: "Understandability",
        confusion: "Confusion",
        distraction: "Distraction",
        readability: "Readability",
        infDensity: "Information Density",
        accessibility: "Accessibility"
    };

    $.getJSON('/wappu/getUsability', { projectId: projectId, interfaceVersion: 'A' }, function(data) {
        $('#usersA').html('<strong>' + data.usabilityValues.length + '</strong>');

        var expectedUsability = ((data.expectedUsability - USABILITY_MIN) * USABILITY_STEP);
        var usabilityStdev = (data.usabilityStdev * USABILITY_STEP);

        $('#usabilityA-value').html(expectedUsability.toPrecision(3) + '% <span class="stdev">&plusmn; '
            + usabilityStdev.toPrecision(3) + '%</span>');
        SIO.drawBar('usabilityA-bar', '#fff', expectedUsability, usabilityStdev);

        for (var e in data.inuitItems) {
            var expectedValue = (data.inuitItems[e].expectedValue - ITEM_MIN) * ITEM_STEP;
            var stdev = data.inuitItems[e].stdev * ITEM_STEP;

            $('#' + e + 'A-value').html(data.inuitItems[e].expectedValue.toFixed(1) + ' <span class="stdev">&plusmn; '
                + data.inuitItems[e].stdev.toFixed(1) + '</span>');
            SIO.drawBar(e + 'A-bar', '#fff', expectedValue, stdev);
        }
    });

    $.getJSON('/wappu/getRelativeUsability', { projectId: projectId }, function(data) {
        $('#usersB').html('<strong>' + data.metaInfo.usersB + '</strong>');

        var iconSize = 'icon-2x';
        var overallPoints = 0;

        $.each(data, function(e, v) {
            if (e == 'metaInfo') {
                return;
            }

            var tableContent = '';
            var points = 0;

            for (var i=0; i<v.length; ++i) {
                tableContent += '<tr><td>' + v[i].feature + '</td><td>' + v[i].correlation.toFixed(2)
                    + '</td><td>' + v[i].valueA.toFixed(2) + ' <span class="stdev">&plusmn;' + v[i].stdevA.toFixed(2)
                    + '</span></td><td>' + v[i].valueB.toFixed(2) + ' <span class="stdev">&plusmn; '
                    + v[i].stdevB.toFixed(2) + '</span></td></tr>';
                points += v[i].points;
            }

            if (points < 0) {
                $('#' + e + 'B-value')
                    .html('<i class="icon-circle-arrow-down ' + iconSize + '"></i>')
                    .parent().find('td')
                        .mouseover(function() {
                            $('#item-label').html('<em>' + USABILITY_ITEMS[e] + '</em>');
                            $('#correlations tr:not(.header)').remove();
                            $('#correlations').append(tableContent);
                            $(this).closest('table').find('td').css('background-color', 'transparent');
                            $(this).parent().find('td').css('background-color', '#2e2e2e');
                        });
                overallPoints--;
            } else if (points > 0) {
                $('#' + e + 'B-value').html('<i class="icon-circle-arrow-up ' + iconSize + '"></i>');
                overallPoints++;
            } else {
                $('#' + e + 'B-value').html('<i class="icon-minus ' + iconSize + '"></i>');
            }
        });

        if (overallPoints < 0) {
            $('#usabilityB-value').html('<i class="icon-circle-arrow-down ' + iconSize + '"></i>');
        } else if (overallPoints > 0) {
            $('#usabilityB-value').html('<i class="icon-circle-arrow-up ' + iconSize + '"></i>');
        } else {
            $('#usabilityB-value').html('<i class="icon-minus ' + iconSize + '"></i>');
        }
    });

})(jQuery);
