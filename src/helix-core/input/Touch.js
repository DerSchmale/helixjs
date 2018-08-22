import {InputPlugin} from "./InputPlugin";
import {onPreFrame} from "../Helix";

/**
 * @classdesc
 *
 * The Touch class allows mapping touch input to named actions.
 *
 * @property sensitivityX The horizontal single-finger movement sensitivity
 * @property sensitivityY The vertical single-finger movement sensitivity
 * @property sensitivityPinch The sensitivity for two-finger pinching
 *
 * @constructor
 */
function Touch()
{
	// TODO: Add a way to map regions on the screen that can be tapped

	// TODO: In the callback, should we always check if the first touch is in the list of target touches?

	InputPlugin.call(this);

	this.sensitivityX = 1;
	this.sensitivityY = 1;
	this.sensitivityPinch = 1;

	this._onTouchMove = this._onTouchMove.bind(this);
	this._onTouchStart = this._onTouchStart.bind(this);
	this._onTouchEnd = this._onTouchEnd.bind(this);

	this._previousX = undefined;
	this._previousY = undefined;
	this._touchX = undefined;
	this._touchY = undefined;
	this._pinchDistance = 0;
}

/**
 * The axis name for when the finger moves horizontally over the canvas
 */
Touch.MOVE_X = 0;

/**
 * The axis name for when the finger moves vertically over the canvas
 */
Touch.MOVE_Y = 1;

/**
 * The axis name for the finger position on the canvas. 0 means all the way left, 1 means all the way right.
 */
Touch.POS_X = 2;

/**
 * The axis name for the finger position on the canvas. 0 means all the way to the top, 1 means all the way to the bottom.
 */
Touch.POS_Y = 3;

/**
 * The axis name for the pinch gesture on the canvas. Positive means growth, negative means shrinkage.
 */
Touch.PINCH = 4;

Touch.prototype = Object.create(InputPlugin.prototype);

/**
 * @ignore
 */
Touch.prototype.onEnabled = function()
{
	onPreFrame.bind(this._onPreFrame, this);
	document.addEventListener("touchmove", this._onTouchMove); // finger can move over the document
	document.addEventListener("touchstart", this._onTouchStart);
	document.addEventListener("touchend", this._onTouchEnd);		// finger can go up over the document
};

/**
 * @ignore
 */
Touch.prototype.onDisabled = function()
{
	onPreFrame.unbind(this._onPreFrame);
	document.removeEventListener("touchmove", this._onTouchMove);
	document.removeEventListener("touchstart", this._onTouchStart);
	document.removeEventListener("touchend", this._onTouchEnd);
};

/**
 * @ignore
 * @private
 */
Touch.prototype._onTouchStart = function(event)
{
	var numTouches = event.touches.length;

	this._previousX = undefined;
	this._previousY = undefined;

	var touch1 = event.touches[0];
	// update the main touch
	if (numTouches === 1) {
		this._updatePos(touch1.clientX, touch1.clientY);
	}
	else if (numTouches === 2) {
		var touch2 = event.touches[1];
		var dx = touch1.screenX - touch2.screenX;
		var dy = touch1.screenY - touch2.screenY;
		this._pinchDistance = Math.sqrt(dx*dx + dy*dy);

		// won't be handling moves anymore
		this._touchX = undefined;
		this._touchY = undefined;
	}
};

/**
 * @ignore
 * @private
 */
Touch.prototype._onTouchEnd = function(event)
{
	this._previousX = undefined;
	this._previousY = undefined;

	var numTouches = event.touches.length;
	var touch1 = event.touches[0];
	if (numTouches === 0) {
		// TODO: Add tap gesture if touch pos hasn't moved
	}
	else if (numTouches === 1) {
		this._updatePos(touch1.clientX, touch1.clientY);
		this._updatePos(touch1.clientX, touch1.clientY);
	}
};

/**
 * @ignore
 * @private
 */
Touch.prototype._onTouchMove = function(event)
{
	event.preventDefault();

	var numTouches = event.touches.length;
	var touch1 = event.touches[0];

	if (numTouches === 1) {
		this._updatePos(touch1.clientX, touch1.clientY);
	}
	else if (numTouches === 2) {
		var touch2 = event.touches[1];
		var dx = touch1.screenX - touch2.screenX;
		var dy = touch1.screenY - touch2.screenY;
		var dist = Math.sqrt(dx*dx + dy*dy);
		var diff = (dist - this._pinchDistance) / this._pinchDistance;
		this._pinchDistance = dist;
		this.setValue(Touch.PINCH, diff * this.sensitivityPinch);
	}

};

Touch.prototype._updatePos = function(x, y)
{
	this._touchX = x / window.innerWidth;
	this._touchY = y / window.innerHeight;
};

Touch.prototype._onPreFrame = function()
{
	var touchX = this._touchX;
	var touchY = this._touchY;
	var aspect = window.innerWidth / window.innerHeight;

	if (this._previousX !== undefined) {
		var dx = (touchX - this._previousX) * this.sensitivityX;
		var dy = (touchY - this._previousY) * this.sensitivityY;

		this.setValue(Touch.MOVE_X, dx * aspect);
		this.setValue(Touch.MOVE_Y, dy);
	}

	this._previousX = touchX;
	this._previousY = touchY;

	this.setValue(Touch.POS_X, touchX);
	this.setValue(Touch.POS_Y, touchY);
};


export {Touch};