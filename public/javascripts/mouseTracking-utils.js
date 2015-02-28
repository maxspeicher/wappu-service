/**
 * @package TellMyRelevance
 * @author maximilian.speicher@unister.de
 * @version 1.0.0
 * 
 * @tableofcontents
 * 1. Various Helper Functions
 * 2. Cookie Utils
 * 3. Base 64 Encoding
 * 4. LZW Compression
 * 5. URL-safe Compression (LZW + Base64)
 * 6. Async Request
 * 7. Private variables used by Random Mouse Cursor
 * 8. Various helper functions also used by other packages
 *
 * THIS FILE HAS TO BE LOADED BEFORE ALL OTHER MOUSE-TRACKING-RELATED SCRIPTS!!!
 */



/**
 * Global namespace for this package.
 */
var TMR = TMR || {};



/**
 * @section 1. Various Helper Functions
 */

/**
 * Removes NUL characters from a given string.
 * @param {string} s The given string.
 * @returns {string} The string without NUL characters.
 */
TMR.removeNullCharacter = function(s) {
    return unescape(escape(s).replace(/%00/g, ''));
};

/**
 * Checks whether a given point lies within a given rectangle. Points on the border/edge count as inside.
 * @param {object} r A rectangle in the form <code>{left: v, top: w, right: x, bottom: y}</code>.
 * @param {int} x The x coordinate of the point.
 * @param {int} y The y coordinate of the point.
 * @returns {boolean} <code>true</code> if the point lies within the rectangle.
 */
TMR.containsPoint = function(r, x, y) {
    return (
        x >= r.left &&
        x <= r.right &&
        y >= r.top &&
        y <= r.bottom
    );
};

/**
 * Checks whether a given number lies between two other numbers with a certain accepted imprecision. Equality of two
 * numbers counts as between.
 * @param {int} x The point that lies on the straight or not.
 * @param {int} y One end point of the straight. 
 * @param {int} z Another end point of the straight.
 * @param {double} EPS The accepted imprecision.
 * @returns {boolean} <code>true</code> if x lies between y and z with the required precision.
 */
TMR.liesBetween = function(x, y, z, EPS) {
    var small = (y <= z) ? y : z;
    var big = (y > z) ? y : z;
    
    return (x >= small-EPS && x <= big+EPS);
};

/**
 * Calculates the intersection of two lines.
 * @param {array} l1 A line in the form <code>[x1, y1, x2, y2]</code>.
 * @param {array} l2 Another line in the form <code>[x1, y1, x2, y2]</code>.
 * @param {double} EPS The accepted imprecision in pixels.
 * @returns {array} The point of intersection <code>[x, y]</code> or <code>null</code> if the lines do not intersect or
 *  are parallel.
 */
TMR.lineIntersect = function(l1, l2, EPS) {
    var x1 = l1[0];
    var y1 = l1[1];
    var x2 = l1[2];
    var y2 = l1[3];
    var x3 = l2[0];
    var y3 = l2[1];
    var x4 = l2[2];
    var y4 = l2[3];
    
    var denominator = (x1 - x2)*(y3 - y4) - (y1 - y2)*(x3 - x4);
    
    if (denominator === 0) {
        return null;
    }
    
    var x = ((x1*y2 - y1*x2)*(x3 - x4) - (x1 - x2)*(x3*y4-y3*x4)) / denominator;
    var y = ((x1*y2 - y1*x2)*(y3 - y4) - (y1 - y2)*(x3*y4-y3*x4)) / denominator;
    
    if (!(TMR.liesBetween(x, x1, x2, EPS) && TMR.liesBetween(x, x3, x4, EPS) && TMR.liesBetween(y, y1, y2, EPS) &&
            TMR.liesBetween(y, y3, y4, EPS))) {
        return null;
    } else {
        return [x, y];
    }
};

/**
 * Calculates the distance (in pixels between two points.
 * @param {int} x1 The x coordinate of the first point.
 * @param {int} y1 The y coordinate of the first point.
 * @param {int} x2 The x coordinate of the second point.
 * @param {int} y2 The y coordinate of the second point.
 * @returns {Number} The distance in pixels.
 */
TMR.distance = function(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2-x1, 2) + Math.pow(y2-y1, 2));
};



/**
 * @section 2. Cookie Utils
 */

/**
 * http://stackoverflow.com/a/6125366
 */
TMR.cookiesEnabled = function() {
    if ('cookieEnabled' in navigator && navigator.cookieEnabled) {
        return true;
    } else if ('cookie' in document &&
            (document.cookie = 'TESTCOOKIE=testcookie').indexOf.call(document.cookie, 'testcookie') > -1) {
        return true;
    }
    
    return false;
};

TMR.cookiesEnabledOld = function() {
    var ce = navigator.cookieEnabled ? true : false;
    
    if (typeof navigator.cookieEnabled == "undefined" && !ce) {
        document.cookie = "TESTCOOKIE=testcookie";
        ce = (document.cookie.indexOf("testcookie") != -1) ? true : false;
    }
    
    return ce;
};

TMR.readCookie = function(key) {
    var keyEQ = key + "=";
    var ca = document.cookie.split(';');
    
    for (var i=0; i<ca.length; i++) {
        var c = ca[i];
        
        while (c.charAt(0) == ' ') {
            c = c.substring(1, c.length);
        }
        
        if (c.indexOf(keyEQ) == 0) {
            return c.substring(keyEQ.length, c.length);
        }
    }
    
    return null;
};



/**
 * @section 3. Base 64 Encoding
 * found at: http://stackoverflow.com/a/6740027
 */

var Base64 = {
    /**
     * private property
     */
    _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",

    /**
     * public method for encoding
     */
    encode : function (input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;

        input = Base64._utf8_encode(input);

        while (i < input.length) {

            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;

            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }

            output = output +
            Base64._keyStr.charAt(enc1) + Base64._keyStr.charAt(enc2) +
            Base64._keyStr.charAt(enc3) + Base64._keyStr.charAt(enc4);

        }

        return output;
    },

    /**
     * public method for decoding
     */
    decode : function (input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;

        input = input.replace(/[^A-Za-z0-9_-]/g, "");

        while (i < input.length) {

            enc1 = Base64._keyStr.indexOf(input.charAt(i++));
            enc2 = Base64._keyStr.indexOf(input.charAt(i++));
            enc3 = Base64._keyStr.indexOf(input.charAt(i++));
            enc4 = Base64._keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output = output + String.fromCharCode(chr1);

            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }

        }

        output = Base64._utf8_decode(output);

        return output;

    },

    /**
     * private method for UTF-8 encoding
     */
    _utf8_encode : function (string) {
        string = string.replace(/\r\n/g,"\n");
        var utftext = "";

        for (var n = 0; n < string.length; n++) {

            var c = string.charCodeAt(n);

            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }

        return utftext;
    },

    /**
     * private method for UTF-8 decoding
     */
    _utf8_decode : function (utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;

        while ( i < utftext.length ) {

            c = utftext.charCodeAt(i);

            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i+1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i+1);
                c3 = utftext.charCodeAt(i+2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }

        }
        return string;
    }
};



/**
 * @section 4. LZW Compression
 * found at: http://stackoverflow.com/questions/294297/javascript-implementation-of-gzip?sort=newest
 */

var LZW = {
    /**
     * LZW-compress a string
     */
    compress: function(s) {
        var dict = {};
        var data = (s + "").split("");
        var out = [];
        var currChar;
        var phrase = data[0];
        var code = 256;
        for (var i=1; i<data.length; i++) {
            currChar=data[i];
            if (dict[phrase + currChar] != null) {
                phrase += currChar;
            }
            else {
                out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
                dict[phrase + currChar] = code;
                code++;
                phrase=currChar;
            }
        }
        out.push(phrase.length > 1 ? dict[phrase] : phrase.charCodeAt(0));
        for (var i=0; i<out.length; i++) {
            out[i] = String.fromCharCode(out[i]);
        }
        return out.join("");
    },

    /**
     * Decompress an LZW-encoded string
     */
    decompress: function(s) {
        var dict = {};
        var data = (s + "").split("");
        var currChar = data[0];
        var oldPhrase = currChar;
        var out = [currChar];
        var code = 256;
        var phrase;
        for (var i=1; i<data.length; i++) {
            var currCode = data[i].charCodeAt(0);
            if (currCode < 256) {
                phrase = data[i];
            }
            else {
               phrase = dict[currCode] ? dict[currCode] : (oldPhrase + currChar);
            }
            out.push(phrase);
            currChar = phrase.charAt(0);
            dict[code] = oldPhrase + currChar;
            code++;
            oldPhrase = phrase;
        }
        return out.join("");
    }
};



/**
 * @section 5. URL-safe Compression
 */

TMR.compress = function(s) {
    return Base64.encode(LZW.compress(s));
};

TMR.decompress = function(s) {
    return LZW.decompress(Base64.decode(s));
};



/**
 * @section 6. Async Request
 */

/**
 * Sends away data asynchronously. Not designed for receiving data.
 * @param {string} basicUrl The basic URL for the request, e.g. "http://example.com/index.php"
 * @param {string} paramsString The data to be sent via GET, e.g. "?msg=abcdefg"
 */
TMR.doAsyncRequest = function(basicUrl, paramsString) {
    var img = new Image();
    img.src = basicUrl + paramsString;
};



/**
 * @section 7. Private variables used by Random Mouse Cursor
 */

TMR._isRMC = false;
TMR._metaBuffer = [];

/**
 * @section 8. Various helper functions also used by other packages
 */

TMR.loadScripts = function(scripts, callback) {
    var loadScript = function(i) {
        var s = document.createElement('script');

        s.src = scripts[i];
        s.onload = i < scripts.length-1 ? function() { loadScript(i+1) } : callback;

        document.getElementsByTagName('head')[0].appendChild(s);
    };

    if (scripts.length > 0) {
        loadScript(0);
    }
};

TMR.loadCSSFiles = function(cssFiles) {
    for (var i=0; i<cssFiles.length; ++i) {
        var l = document.createElement('link');

        l.rel = 'stylesheet';
        l.type = 'text/css';
        l.href = cssFiles[i];

        document.getElementsByTagName('head')[0].appendChild(l);
    }
};
