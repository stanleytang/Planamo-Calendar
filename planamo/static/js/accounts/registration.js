$(document).ready(function() {
    
    /* Setting the default timezone in form based on local timezone. */
    var tzField = $("#id_timezone");
    var year = new Date().getUTCFullYear(); // get current year
    // Obtain timezone names for summer of this year and winter of same year to
    // determine whether or not DST exists in the local timezone.
    var tzSummer = new Date(Date.UTC(year, 6, 30, 0, 0, 0, 0)).toString();
    var tzWinter = new Date(Date.UTC(year, 12, 30, 0, 0, 0, 0)).toString();

    var sBegIndex = tzSummer.lastIndexOf("(")+1;
    var sEndIndex = tzSummer.lastIndexOf(")");
    var wBegIndex = tzWinter.lastIndexOf("(")+1;
    var wEndIndex = tzWinter.lastIndexOf(")");
    var summerTZName = tzSummer.substring(sBegIndex, sEndIndex);
    var winterTZName = tzWinter.substring(wBegIndex, wEndIndex);

    var finalTZName = "";
    if (summerTZName == winterTZName) finalTZName = summerTZName;
    else {
        finalTZName = (summerTZName > winterTZName) ? 
            summerTZName+"/"+winterTZName : winterTZName+"/"+summerTZName;
    }
    
    tzField.val(finalTZName);
    // TODO have tzField set by timezone offset instead of tz name
    
});