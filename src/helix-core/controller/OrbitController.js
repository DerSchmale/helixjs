/**
 *
 * @param target
 * @constructor
 */
OrbitController = function(lookAtTarget)
{
    HX.Component.call(this);
    this._coords = new HX.Float4(-Math.PI *.75, Math.PI * .4, 1.0, 0.0);   // azimuth, polar, radius
    this._localAcceleration = new HX.Float4(0.0, 0.0, 0.0, 0.0);
    this._localVelocity = new HX.Float4(0.0, 0.0, 0.0, 0.0);

    this.maxRadius = 4.0;
    this.minRadius = 0.1;
    this.dampen = .9;
    this.lookAtTarget = lookAtTarget || new HX.Float4(0.0, 0.0, 0.0, 1.0);
    this._oldMouseX = 0;
    this._oldMouseY = 0;
    this._onMouseWheel = null;
    this._onMouseMove = null;
};

OrbitController.prototype = Object.create(HX.Component.prototype,
    {
        radius: {
            get: function() { return this._coords.z; },
            set: function(value) { this._coords.z = value; }
        },

        azimuth: {
            get: function() { return this._coords.x; },
            set: function(value) { this._coords.x = value; }
        },

        polar: {
            get: function() { return this._coords.y; },
            set: function(value) { this._coords.y = value; }
        }
    });

OrbitController.prototype.onAdded = function()
{
    var self = this;

    this._onMouseWheel = function(event)
    {
        self.setZoomImpulse(-event.wheelDelta *.0001);
    };

    this._onMouseMove = function(event)
    {
        var leftDown = event.buttons & 1;
        if (leftDown) {
            // it's not a continuous force
            var dx = event.screenX - this._oldMouseX;
            var dy = event.screenY - this._oldMouseY;
            self.setAzimuthImpulse(dx * .005);
            self.setPolarImpulse(-dy * .005);
        }
        this._oldMouseX = event.screenX;
        this._oldMouseY = event.screenY;
    };

    document.addEventListener("mousewheel", this._onMouseWheel);
    document.addEventListener("mousemove", this._onMouseMove);
};

OrbitController.prototype.onRemoved = function()
{
    document.removeEventListener("mousewheel", this._onMouseWheel);
    document.removeEventListener("mousemove", this._onMouseMove);
};

OrbitController.prototype.onUpdate = function(dt)
{
    this._localVelocity.x *= this.dampen;
    this._localVelocity.y *= this.dampen;
    this._localVelocity.z *= this.dampen;
    this._localVelocity.x += this._localAcceleration.x;
    this._localVelocity.y += this._localAcceleration.y;
    this._localVelocity.z += this._localAcceleration.z;
    this._localAcceleration.x = 0.0;
    this._localAcceleration.y = 0.0;
    this._localAcceleration.z = 0.0;

    this._coords.add(this._localVelocity);
    this._coords.y = HX.clamp(this._coords.y, 0.1, Math.PI - .1);
    this._coords.z = HX.clamp(this._coords.z, this.minRadius, this.maxRadius);

    var matrix = this.entity.matrix;
    var pos = new HX.Float4();
    pos.fromSphericalCoordinates(this._coords.z, this._coords.x, this._coords.y);
    pos.add(this.lookAtTarget);
    matrix.lookAt(this.lookAtTarget, pos, HX.Float4.Y_AXIS);
    this.entity.matrix = matrix;
};

    // ratio is "how far the controller is pushed", from -1 to 1
OrbitController.prototype.setAzimuthImpulse  = function(value)
{
    this._localAcceleration.x = value;
};

OrbitController.prototype.setPolarImpulse = function(value)
{
    this._localAcceleration.y = value;
};

OrbitController.prototype.setZoomImpulse = function(value)
{
    this._localAcceleration.z = value;
};