(function($) {

    $.WaPPUUtils = {
        _tmp: {},
        path: 'http://localhost:8081',

        ts: function() {
            return (new Date()).getTime();
        },

        postData: function(data, callback, customId, customPath) {
            var idAppendix = customId ? ('-' + customId) : '';
            var pathAppendix = customPath ? customPath : '/wappu/saveData';
            var tmpKey = this.ts();

            var $iframe = $('#wappu-post' + idAppendix);

            if ($iframe.length === 0) {
                $iframe = $('<iframe id="wappu-post' + idAppendix + '" style="display: none"></iframe>');
                $('body').append($iframe);
            } else {
                $iframe.contents().find('body').find('form').remove();
            }

            var $form = $('<form method="post" action="' + this.path + pathAppendix + '"></form>');
        
            for (var e in data) {
                $form.append('<input type="hidden" name="' + e + '" value=\'' + data[e] + '\' />');
            }

            this._tmp[tmpKey] = callback ? callback : function() {};

            $iframe.contents().find('body').append($form);
            $iframe.attr('onload', '$.WaPPUUtils._tmp[' + tmpKey + ']()');
            $form.submit();
        }
    };

})(jQuery);
