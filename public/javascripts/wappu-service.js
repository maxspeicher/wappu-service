(function($) {

	var path = 'js'; //'http://sio.labs.bluekiwi.de/wappu-service';

	var projectId = 0; //(new Date()).getTime() + '' + Math.round(Math.random() * 1000);
	var interfaceA = { projectId: projectId, interfaceVersion: 'A', provideQuestionnaire: true };
	var interfaceB = { projectId: projectId, interfaceVersion: 'B' };
	var configuration = {};

	/*
	 * PREDEFINED CONFIGURATIONS
	 */
	var predefinedConfigs = {
		serp: {
			//'#searchbox': ['charsDeleted', 'charsTyped', 'inputFocusAmount'],
			'#searchresults': ['clicks']
		}
	};

	var getSnippets = function() {
		var prefix = '<script src="' + path + '/wappu-tracking.min.js"></script>'
				+ '<script>WaPPU.start(';
		var postfix = ');</script>';

		return {
			A: prefix + JSON.stringify(interfaceA) + ',' + JSON.stringify(configuration) + postfix,
			B: prefix + JSON.stringify(interfaceB) + ',' + JSON.stringify(configuration) + postfix
		};
	};

	var updateTextareas = function() {
		var snippets = getSnippets();

		$('#snippet-a').val(snippets.A);
		$('#snippet-b').val(snippets.B);
	};

	updateTextareas();

	var usePredefinedConfig = function() {
		var val = $('#config-predefined-select option:selected').eq(0).attr('value');

		if (val) {
			configuration = predefinedConfigs[val];
			updateTextareas();
		}
	};

	var useCustomConfig = function() {
		configuration = {};

		$('.custom-component:visible').each(function(i) {
			// The 2nd input element in the hidden template for adding new rows (#custom-rule-template) does not have
			// class custom-features.
			var $features = $('.custom-features').eq(i);

			var component = $(this).val();
			var features = [];
			var tokens = $features.tokenInput('get');

			if (!component || tokens.length == 0) {
				return;
			}

			for (var i=0; i<tokens.length; ++i) {
				features.push(tokens[i].id);
			}

			configuration[component] = features;
		});

		updateTextareas();
	};

	$('input[name="choose-config"]').change(function() {
		var options = {
			'#check-predefined': '#config-predefined',
			'#check-custom': '#config-custom'
		};

		for (var e in options) {
			var $inputs = $(options[e] + ' :input')
			var $div = $(options[e]);

			if ($(e).is(':checked')) {
				if (e == '#check-predefined') {
					usePredefinedConfig();
				} else {
					useCustomConfig();
				}

				$div.css('opacity', 1.0);
				$inputs.removeAttr('disabled');
			} else {
				$div.css('opacity', 0.33);
				$inputs.attr('disabled', true);
			}
		}
	});

	$('#config-predefined-select').change(function() {
		usePredefinedConfig();
	});

	var prepareTokenInput = function($element) {
		$element.tokenInput('/wappu/getFeatures', {
			hintText: 'Type in a mouse feature ...',
			theme: 'facebook',
			onAdd: useCustomConfig,
			onDelete: useCustomConfig
		});
	};

	$(function() {
		prepareTokenInput($('.custom-features'));

		$('input[name="projectId"]').val(projectId);
		$('#check-predefined').change();

		$('.custom-component').on('blur', function() {
			useCustomConfig();
		});

		$('form').submit(function(e) {
      e.preventDefault();
      $.ajax({
        type: $(this).attr('method'),
        cache: false,
        url: $(this).attr('action'),
        data: $(this).serialize(), 
        success: function() {
          alert('The study has been successfully saved!');
        }
      });
    });
	});

	$('a.add-custom-rule').click(function() {
		var $newInputLine = $('#custom-rule-template').clone(true);
		var $tokenInputField = $newInputLine.find('input').eq(1).addClass('custom-features');

		$newInputLine.removeAttr('id').addClass('custom-rule');

		$('#config-custom').append($newInputLine.show());
		$(this).remove();

		prepareTokenInput($tokenInputField);
	});

})(jQuery);
