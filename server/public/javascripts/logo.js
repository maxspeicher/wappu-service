$(function() {
    var Ps = [
        Raphael($('.sio-logo').get(0), 100, 100),
        Raphael($('.sio-logo').get(1), 100, 100)
    ];

    $.each(Ps, function(i, val) {
        var P = val;
        var strokeCfg = {'stroke': '#eee', 'stroke-width': 3};
        var logo = P.set();

        logo.push(
                P.rect(5, 5, 70, 70, 5),
                P.path('M5,21L75,21'),
                P.path('M71,9L63,17M63,9L71,17'),
                P.path('M58,17L58,9L50,9L50,17L59.5,17'),
                P.path('M45,17L37,17')
        );
        logo.attr(strokeCfg);

        var arrow = P.path('M40,75L40,95L95,95L95,40L72,40');
        arrow.attr(strokeCfg);
        arrow.attr('arrow-end', 'open-narrow-short');

        //var cursor = P.path('M53,61L27,35');
        //cursor.attr({
        //    'stroke': '#eee',
        //    'stroke-width': 5,
        //    'arrow-end': 'block-wide-long'
        //});

        var magnifier = P.set();

        magnifier.push(
                P.circle(37, 45, 10),
                P.path('M53,61L45,53')
        );
        magnifier.attr({
            'stroke': '#eee',
            'stroke-width': 5
        });
    });
});
