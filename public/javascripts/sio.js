var OPACITY = 0.33;
var SIO = {};

(function() {
    SIO.drawBar = function(container, color, mean, stdev, stdevRight) {
        var paper = Raphael(container, 102, 26);
        var rect = paper.rect(1, 15, 100, 10);
        
        if (!stdevRight) {
            stdevRight = stdev;
        }

        if (mean - stdev < 0) {
            stdev = mean;
        }
        
        if (mean + stdevRight > 100) {
            stdevRight = 100 - mean;
        }
        
        // Gradient from red over yellow to green
        rect.attr('fill', '0-#ff0000-#ffff00-#00ff00');
        
        // Sets the stroke attribute of the circle to black
        rect.attr('stroke', color);
        
        var arrow = paper.path('M' + (1+mean) + ',15l-7,-14h14l-7,14');
        
        arrow.attr('fill', color);
        arrow.attr('stroke', color);
        
        var stdevPath = paper.path('M' + (1+mean-stdev)
                                   + ',7v-3v6v-3h' + (stdev + stdevRight)
                                   + 'v-3v6v-3');
        
        stdevPath.attr('stroke', color);
    };

    SIO.drawTrafficLight = function(container, stroke, colorToBeHighlighted) {
        var paper = Raphael(container, 40, 106);
        var rect = paper.rect(1, 1, 38, 104);
        var circles = {};
        var OPACITY = 0.2;
        
        rect.attr('fill', '#222');
        rect.attr('stroke', stroke);
        
        var drawCircle = function(color, x, y, r) {
            circles[color] = paper.circle(x, y, r);
            
            circles[color].attr('fill', color);
            circles[color].attr('stroke', '#fff');
            circles[color].attr('fill-opacity', OPACITY);
            circles[color].attr('stroke-opacity', OPACITY);
        };
        
        drawCircle('red', 20, 20, 13);
        drawCircle('yellow', 20, 52, 13);
        drawCircle('green', 20, 84, 13);
        
        circles[colorToBeHighlighted].attr('fill-opacity', 1);
        circles[colorToBeHighlighted].attr('stroke-opacity', 1);
        circles[colorToBeHighlighted].glow({
            color: colorToBeHighlighted,
            width: 8
        });
    };
})();

$(function() {
    $('a').each(function() {
        var content = $(this).html();
        var extension = /^\S+\.([a-z]{3,4})$/.exec(content);

        if (extension != null) {
            $(this)
                .html('<img class="file" src="/images/icons/' + extension[1] + '.png" width="16" height="16" /> '
                    + content)
                .css('display', 'inline-block');
        }
    });

    $('img.logo')
        .css('opacity', OPACITY)
        .focus(function() { $(this).blur(); })
        .hover(function() {
            $(this)
                .css('opacity', 1)
                .attr('src', $(this).attr('src').replace(/\.png/, '_rgb.png'));
        }, function() {
            $(this)
                .css('opacity', OPACITY)
                .attr('src', $(this).attr('src').replace(/_rgb\.png/, '.png'));
        });

    var $w = $(window);
    var $b = $('body');
    var $title = $('#title');
    var $floatingLogo = $('#floating-logo');

    $w.scroll(function() {
        if ($title.length == 0) {
            return;
        }
        
        if ($w.scrollTop() > $title.offset().top + $title.outerHeight()) {
            $floatingLogo.removeClass('hidden').addClass('visible-desktop');
        } else {
            $floatingLogo.removeClass('visible-desktop').addClass('hidden');
        }
    });
});
