/**
 * Cross browser way of comparing different color types
 *
 * Inspired by:
 * http://dean.edwards.name/weblog/2009/10/convert-any-colour-value-to-hex-in-msie/
 *
 * @author Christopher Blum
 * @example
 *    compareColors("fuchsia", "rgb(255, 0, 255)");
 *    // => true
 *
 *    compareColors("blue", "#000");
 *    // => false
 */
var compareColors;

if (window.getComputedStyle) { // Chrome, Safari, Firefox, IE9
  
  compareColors = (function() {
    var tempElement = document.createElement("span");
    tempElement.className = "_color-converter";
    tempElement.style.display = "none";
    
    function _getRgb(color) {
      tempElement.style.color = color;
      return window.getComputedStyle(tempElement, null).getPropertyValue("color");
    }
    
    return function(color1, color2) {
      if (!tempElement.parentNode) {
        document.body.appendChild(tempElement);
      }
      return _getRgb(color1) === _getRgb(color2);
    };
  })();
  
} else if (window.createPopup) { // MSIE

  compareColors = (function() {
    var body;

    function _getHex(color) {
      var range,
          value;
      body = body || createPopup().document.body;
      range = body.createTextRange();
      body.style.color = color;
      value = range.queryCommandValue("ForeColor");
      value = ((value & 0x0000ff) << 16) | (value & 0x00ff00) | ((value & 0xff0000) >>> 16);
      value = value.toString(16);
      return "#000000".slice(0, 7 - value.length) + value;
    }

    return function(color1, color2) {
      return _getHex(color1) === _getHex(color2);
    };
  })();

} else { // Dunno...
  compareColors = function() {
    return false;
  };
}