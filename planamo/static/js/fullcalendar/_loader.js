(function() {

var qs = window.location.href.match(/(\?.*)?$/)[0];
var noui = qs.indexOf('noui') != -1;
var prefix;
var tags;


startload();

/* css file is actually loaded in css/fullcalendar/
---------
css('main.css');
css('common/common.css');
css('basic/basic.css');
css('agenda/agenda.css');
cssprint('common/print.css');
*/


js('defaults.js');
js('main.js');
js('Calendar.js');
js('Header.js');
js('EventManager.js');
js('date_util.js');
js('util.js');

js('basic/MonthView.js');
js('basic/BasicWeekView.js');
js('basic/BasicDayView.js');
js('basic/BasicView.js');
js('basic/BasicEventRenderer.js');

js('agenda/AgendaWeekView.js');
js('agenda/AgendaDayView.js');
js('agenda/AgendaView.js');
js('agenda/AgendaEventRenderer.js');

js('common/View.js');
js('common/DayEventRenderer.js');
js('common/SelectionManager.js');
js('common/OverlayManager.js');
js('common/CoordinateGrid.js');
js('common/HoverListener.js');
js('common/HorizontalPositionCache.js');

js('sidebar/EventSlider.js');
js('sidebar/EventTextBox.js');


endload();


window.startload = startload;
window.endload = endload;
window.css = css;
window.js = js;
window.jslib = jslib;


function startload() {
	debug = false;
	prefix = '';
	tags = [];
	var scripts = document.getElementsByTagName('script');
	for (var i=0, script; script=scripts[i++];) {
		if (!script._checked) {
			script._checked = true;
			var m = (script.getAttribute('src') || '').match(/^(.*)_loader\.js(\?.*)?$/);
			if (m) {
				prefix = m[1];
				debug = (m[2] || '').indexOf('debug') != -1;
				break;
			}
		}
	}
}


function endload() {
	document.write(tags.join("\n"));
}


function css(file) {
	tags.push("<link rel='stylesheet' type='text/css' href='" + prefix + file + "' />");
}


function cssprint(file) {
	tags.push("<link rel='stylesheet' type='text/css' href='" + prefix + file + "' media='print' />");
}


function js(file) {
	tags.push("<script type='text/javascript' src='" + prefix + file + "'></script>");
}


function jslib(file) {
	js(file);
}


})();
