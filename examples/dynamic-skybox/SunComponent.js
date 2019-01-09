function SunComponent()
{
    HX.Component.call(this);
    this._dirLight = new HX.DirectionalLight();
    this._dirLight.intensity = 10.0;

    // this just simplfies things to a circular orbit
    this._inclination = 23.5 * HX.MathX.DEG_TO_RAD;    // relative to the orbital plane and the north celestial pole (this is generally "north as well")
    this._latitude = 50.9871;
    this._dayOfYear = 80;
    this._timeOfDay = 12;
    this._v = new HX.Float4();
}

SunComponent.prototype = Object.create(HX.Component.prototype, {
    dayOfYear: {
        get: function() {
            return this._dayOfYear;
        },
        set: function(value) {
            this._dayOfYear = value;
            this._updateLight();
        }
    },
    timeOfDay: {
        get: function() {
            return this._timeOfDay;
        },
        set: function(value) {
            this._timeOfDay = value;
            this._updateLight();
        }
    },
    latitude: {
        get: function() {
            return this._latitude;
        },
        set: function(value) {
            this._latitude = value;
            this._updateLight();
        }
    },
    inclination: {
        get: function() {
            return this._inclination;
        },
        set: function(value) {
            this._inclination = value;
            this._updateLight();
        }
    }
});

SunComponent.prototype.onAdded = function()
{
    this.entity.addComponent(this._dirLight);
    this._updateLight();
};

SunComponent.prototype.onRemoved = function()
{
    this.entity.removeComponent(this._dirLight);
};

SunComponent.prototype._updateLight = function()
{
    // borrowing it for a second
    var q = this.entity.rotation;

    // 172 is June 21st, average summer solstice
    var orbitAngle = (this._dayOfYear - 172) / 365 * Math.PI * 2.0;

    // probably just need to ignore orbit in this way, and use it instead to figure out rotation

    var dayAngle = (this._timeOfDay / 24 - .5) * Math.PI * 2.0;

    // sun direction in the XZ plane in absolute zenith
    this._v.x = -Math.sin(dayAngle);
    // the effect of inclination changes depending on the time of year
    // TODO: This is incorrect
    this._v.y = Math.sin(this._inclination) * Math.cos(orbitAngle);
    this._v.z = Math.cos(dayAngle);


    q.fromAxisAngle(HX.Float4.X_AXIS, this._latitude * HX.MathX.DEG_TO_RAD);

    q.rotate(this._v, this._v);

    // we could also just set the rotation, but this is easier to debug
    this.entity.position = this._v;
    this.entity.lookAt(HX.Float4.ORIGIN_POINT);
};

HX.Component.register("sun", SunComponent);