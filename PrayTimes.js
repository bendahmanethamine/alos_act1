function PrayTimes(method) {


    let params;
    let i;
//------------------------ Constants --------------------------
    let // Time Names
        timeNames = {
            imsak: 'Imsak',
            fajr: 'Fajr',
            sunrise: 'Sunrise',
            dhuhr: 'Dhuhr',
            asr: 'Asr',
            sunset: 'Sunset',
            maghrib: 'Maghrib',
            isha: 'Isha',
            midnight: 'Midnight'
        },


        // Calculation Methods
        methods = {
            DZ: {
                name: 'Ministry of Religious Affairs and Endowments Algeria',
                params: {fajr: 18, isha: 17}
            },
            MWL: {
                name: 'Muslim World League',
                params: {fajr: 18, isha: 17.5}
            },
            ISNA: {
                name: 'Islamic Society of North America (ISNA)',
                params: {fajr: 15, isha: 15}
            },
            Egypt: {
                name: 'Egyptian General Authority of Survey',
                params: {fajr: 19.5, isha: 17.5}
            },
            Makkah: {
                name: 'Umm Al-Qura University, Makkah',
                params: {fajr: 18.5, isha: '90 min'}
            },  // fajr was 19 degrees before 1430 hijri
            Karachi: {
                name: 'University of Islamic Sciences, Karachi',
                params: {fajr: 18, isha: 18}
            },
            Tehran: {
                name: 'Institute of Geophysics, University of Tehran',
                params: {fajr: 17.7, isha: 14, maghrib: 4.5, midnight: 'Jafari'}
            },  // isha is not explicitly specified in this method
            Jafari: {
                name: 'Shia Ithna-Ashari, Leva Institute, Qum',
                params: {fajr: 16, isha: 14, maghrib: 4, midnight: 'Jafari'}
            }
        },

        calcMethod = 'DZ',

        // do not change anything here; use adjust method instead
        setting = {
            imsak: '10 min',
            dhuhr: '0 min',
            asr: 'Standard',
            highLats: 'NightMiddle'
        },

        timeFormat = '24h',
        timeSuffixes = ['am', 'pm'],
        invalidTime = '-----',

        numIterations = 1,
        offset = {},


        //----------------------- Local Variables ---------------------

        lat, lng, elv,       // coordinates
        timeZone, jDate;     // time variables


    //---------------------- Initialization -----------------------


    // set methods defaults
    let defParams = {
        maghrib: '0 min', midnight: 'Standard'

    };
    for (i in methods) {
        params = methods[i].params;
        for (let j in defParams)
            if ((typeof (params[j]) == 'undefined'))
                params[j] = defParams[j];
    }

    // initialize settings
    calcMethod = methods[method] ? method : calcMethod;
    params = methods[calcMethod].params;
    for (let id in params)
        setting[id] = params[id];

    // init time offsets
    for (i in timeNames)
        offset[i] = 0;


    //----------------------- Public Functions ------------------------
    return {


        // set calculation method
        setMethod: function (method) {
            if (methods[method]) {
                this.adjust(methods[method].params);
                calcMethod = method;
            }
        },


        // set calculating parameters
        adjust: function (params) {
            for (let id in params)
                setting[id] = params[id];
        },


        // return prayer times for a given date
        getTimes: function (date, coords, timezone, dst, format) {
            lat = 1 * coords[0];
            lng = 1 * coords[1];
            elv = coords[2] ? 1 * coords[2] : 0;
            timeFormat = format || timeFormat;
            if (date.constructor === Date)
                date = [date.getFullYear(), date.getMonth() + 1, date.getDate()];
            if (typeof (timezone) == 'undefined' || timezone === 'auto')
                timezone = this.getTimeZone(date);
            if (typeof (dst) == 'undefined' || dst === 'auto')
                dst = this.getDst(date);
            timeZone = timezone + (1 * dst ? 1 : 0);
            jDate = this.julian(date[0], date[1], date[2]) - lng / (15 * 24);

            return this.computeTimes();
        },


        // convert float time to the given format (see timeFormats)
        getFormattedTime: function (time, format, suffixes) {
            if (isNaN(time))
                return invalidTime;
            if (format === 'Float') return time;
            suffixes = suffixes || timeSuffixes;

            time = DMath.fixHour(time + 0.5 / 60);  // add 0.5 minutes to round
            let hours = Math.floor(time);
            let minutes = Math.floor((time - hours) * 60);
            let suffix = (format === '12h') ? suffixes[hours < 12 ? 0 : 1] : '';
            let hour = (format === '24h') ? this.twoDigitsFormat(hours) : ((hours + 12 - 1) % 12 + 1);
            return hour + ':' + this.twoDigitsFormat(minutes) + (suffix ? ' ' + suffix : '');
        },


        //---------------------- Calculation Functions -----------------------


        // compute mid-day time
        midDay: function (time) {
            let eqt = this.sunPosition(jDate + time).equation;
            return DMath.fixHour(12 - eqt);
        },


        // compute the time at which sun reaches a specific angle below horizon
        sunAngleTime: function (angle, time, direction) {
            let decl = this.sunPosition(jDate + time).declination;
            let noon = this.midDay(time);
            let t = 1 / 15 * DMath.arccos((-DMath.sin(angle) - DMath.sin(decl) * DMath.sin(lat)) /
                (DMath.cos(decl) * DMath.cos(lat)));
            return noon + (direction === 'ccw' ? -t : t);
        },


        // compute asr time
        asrTime: function (factor, time) {
            let decl = this.sunPosition(jDate + time).declination;
            let angle = -DMath.arccot(factor + DMath.tan(Math.abs(lat - decl)));
            return this.sunAngleTime(angle, time);
        },


        // compute declination angle of sun and equation of time
        // Ref: http://aa.usno.navy.mil/faq/docs/SunApprox.php
        sunPosition: function (jd) {
            let D = jd - 2451545.0;
            let g = DMath.fixAngle(357.529 + 0.98560028 * D);
            let q = DMath.fixAngle(280.459 + 0.98564736 * D);
            let L = DMath.fixAngle(q + 1.915 * DMath.sin(g) + 0.020 * DMath.sin(2 * g));

            let e = 23.439 - 0.00000036 * D;

            let RA = DMath.arctan2(DMath.cos(e) * DMath.sin(L), DMath.cos(L)) / 15;
            let eqt = q / 15 - DMath.fixHour(RA);
            let decl = DMath.arcsin(DMath.sin(e) * DMath.sin(L));

            return {declination: decl, equation: eqt};
        },


        // convert Gregorian date to Julian day
        // Ref: Astronomical Algorithms by Jean Meeus
        julian: function (year, month, day) {
            if (month <= 2) {
                year -= 1;
                month += 12;
            }
            let A = Math.floor(year / 100);
            let B = 2 - A + Math.floor(A / 4);

            return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
        },


        //---------------------- Compute Prayer Times -----------------------


        // compute prayer times at given julian date
        computePrayerTimes: function (times) {
            times = this.dayPortion(times);
            let params = setting;

            let imsak = this.sunAngleTime(this.eval(params.imsak), times.imsak, 'ccw');
            let fajr = this.sunAngleTime(this.eval(params.fajr), times.fajr, 'ccw');
            let sunrise = this.sunAngleTime(this.riseSetAngle(), times.sunrise, 'ccw');
            let dhuhr = this.midDay(times.dhuhr);
            let asr = this.asrTime(this.asrFactor(params.asr), times.asr);
            let sunset = this.sunAngleTime(this.riseSetAngle(), times.sunset);
            let maghrib = this.sunAngleTime(this.eval(params.maghrib), times.maghrib);
            let isha = this.sunAngleTime(this.eval(params.isha), times.isha);

            return {
                imsak: imsak, fajr: fajr, sunrise: sunrise, dhuhr: dhuhr,
                asr: asr, sunset: sunset, maghrib: maghrib, isha: isha
            };
        },


        // compute prayer times
        computeTimes: function () {
            // default times
            let times = {
                imsak: 5, fajr: 5, sunrise: 6, dhuhr: 12,
                asr: 13, sunset: 18, maghrib: 18, isha: 18
            };

            // main iterations
            for (let i = 1; i <= numIterations; i++)
                times = this.computePrayerTimes(times);

            times = this.adjustTimes(times);

            // add midnight time
            times.midnight = (setting.midnight === 'Jafari') ?
                times.sunset + this.timeDiff(times.sunset, times.fajr) / 2 :
                times.sunset + this.timeDiff(times.sunset, times.sunrise) / 2;

            times = this.tuneTimes(times);
            return this.modifyFormats(times);
        },


        // adjust times
        adjustTimes: function (times) {
            let params = setting;
            for (let i in times)
                times[i] += timeZone - lng / 15;

            if (params.highLats !== 'None')
                times = this.adjustHighLats(times);

            if (this.isMin(params.imsak))
                times.imsak = times.fajr - this.eval(params.imsak) / 60;
            if (this.isMin(params.maghrib))
                times.maghrib = times.sunset + this.eval(params.maghrib) / 60;
            if (this.isMin(params.isha))
                times.isha = times.maghrib + this.eval(params.isha) / 60;
            times.dhuhr += this.eval(params.dhuhr) / 60;

            return times;
        },


        // get asr shadow factor
        asrFactor: function (asrParam) {
            let factor = {Standard: 1, Hanafi: 2}[asrParam];
            return factor || this.eval(asrParam);
        },


        // return sun angle for sunset/sunrise
        riseSetAngle: function () {
            //let earthRad = 6371009; // in meters
            //let angle = DMath.arccos(earthRad/(earthRad+ elv));
            let angle = 0.0347 * Math.sqrt(elv); // an approximation
            return 0.833 + angle;
        },


        // apply offsets to the times
        tuneTimes: function (times) {
            for (let i in times)
                times[i] += offset[i] / 60;
            return times;
        },


        // convert times to given time format
        modifyFormats: function (times) {
            for (let i in times)
                times[i] = this.getFormattedTime(times[i], timeFormat);
            return times;
        },


        // adjust times for locations in higher latitudes
        adjustHighLats: function (times) {
            let params = setting;
            let nightTime = this.timeDiff(times.sunset, times.sunrise);

            times.imsak = this.adjustHLTime(times.imsak, times.sunrise, this.eval(params.imsak), nightTime, 'ccw');
            times.fajr = this.adjustHLTime(times.fajr, times.sunrise, this.eval(params.fajr), nightTime, 'ccw');
            times.isha = this.adjustHLTime(times.isha, times.sunset, this.eval(params.isha), nightTime);
            times.maghrib = this.adjustHLTime(times.maghrib, times.sunset, this.eval(params.maghrib), nightTime);

            return times;
        },


        // adjust a time for higher latitudes
        adjustHLTime: function (time, base, angle, night, direction) {
            let portion = this.nightPortion(angle, night);
            let timeDiff = (direction === 'ccw') ?
                this.timeDiff(time, base) :
                this.timeDiff(base, time);
            if (isNaN(time) || timeDiff > portion)
                time = base + (direction === 'ccw' ? -portion : portion);
            return time;
        },


        // the night portion used for adjusting times in higher latitudes
        nightPortion: function (angle, night) {
            let method = setting.highLats;
            let portion = 1 / 2 // MidNight
            if (method === 'AngleBased')
                portion = 1 / 60 * angle;
            if (method === 'OneSeventh')
                portion = 1 / 7;
            return portion * night;
        },


        // convert hours to day portions
        dayPortion: function (times) {
            for (let i in times)
                times[i] /= 24;
            return times;
        },


        //---------------------- Time Zone Functions -----------------------


        // get local time zone
        getTimeZone: function (date) {
            let year = date[0];
            let t1 = this.gmtOffset([year, 0, 1]);
            let t2 = this.gmtOffset([year, 6, 1]);
            return Math.min(t1, t2);
        },


        // get daylight saving for a given date
        getDst: function (date) {
            return 1 * (this.gmtOffset(date) !== this.getTimeZone(date));
        },


        // GMT offset for a given date
        gmtOffset: function (date) {
            let localDate = new Date(date[0], date[1] - 1, date[2], 12, 0, 0, 0);
            let GMTString = localDate.toGMTString();
            let GMTDate = new Date(GMTString.substring(0, GMTString.lastIndexOf(' ') - 1));
            return (localDate - GMTDate) / (1000 * 60 * 60);
        },


        //---------------------- Misc Functions -----------------------

        // convert given string into a number
        eval: function (str) {
            return 1 * (str + '').split(/[^0-9.+-]/)[0];
        },


        // detect if input contains 'min'
        isMin: function (arg) {
            return (arg + '').indexOf('min') !== -1;
        },


        // compute the difference between two times
        timeDiff: function (time1, time2) {
            return DMath.fixHour(time2 - time1);
        },


        // add a leading 0 if necessary
        twoDigitsFormat: function (num) {
            return (num < 10) ? '0' + num : num;
        }

    }
}


//---------------------- Degree-Based Math Class -----------------------


let DMath = {

    dtr: function (d) {
        return (d * Math.PI) / 180.0;
    },
    rtd: function (r) {
        return (r * 180.0) / Math.PI;
    },

    sin: function (d) {
        return Math.sin(this.dtr(d));
    },
    cos: function (d) {
        return Math.cos(this.dtr(d));
    },
    tan: function (d) {
        return Math.tan(this.dtr(d));
    },

    arcsin: function (d) {
        return this.rtd(Math.asin(d));
    },
    arccos: function (d) {
        return this.rtd(Math.acos(d));
    },
    arccot: function (x) {
        return this.rtd(Math.atan(1 / x));
    },
    arctan2: function (y, x) {
        return this.rtd(Math.atan2(y, x));
    },

    fixAngle: function (a) {
        return this.fix(a, 360);
    },
    fixHour: function (a) {
        return this.fix(a, 24);
    },

    fix: function (a, b) {
        a = a - b * (Math.floor(a / b));
        return (a < 0) ? a + b : a;
    }
}


//---------------------- Init Object -----------------------


let prayTimes = new PrayTimes("DZ");
