var WaPPUUtils = {};

(function($) {

	WaPPUUtils._tmp = {};

	WaPPUUtils.path = 'http://localhost:3000';

    WaPPUUtils.ts = function() {
        return (new Date()).getTime();
    };

    WaPPUUtils.postData = function(data, callback) {
        var tmpKey = WaPPUUtils.ts();

        var $iframe = $('<iframe id="wappu-post-' + tmpKey + '" style="display: none"></iframe>');
        var $form = $('<form method="post" action="' + WaPPUUtils.path + '/wappu/saveData"></form>');
        
        $('body').append($iframe);
    
        for (var e in data) {
            $form.append('<input type="hidden" name="' + e + '" value="' + data[e] + '" />');
        }

        WaPPUUtils._tmp[tmpKey] = callback ? callback : function() {};

        $iframe.contents().find('body').append($form);
        $iframe.attr('onload', 'WaPPUUtils._tmp[' + tmpKey + ']()');
        $form.submit();
    };

    WaPPUUtils.stringify = function(jsonObj) {
        return JSON.stringify(jsonObj).replace(/'/g, '\\\'').replace(/"/g, '\'');
    };
})(jQuery);