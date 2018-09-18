import {InputPlugin} from "./InputPlugin";
import {META, onPreFrame} from "../Helix";
import {MathX} from "../math/MathX";

/**
 * @classdesc
 *
 * The Mouse class enables Mouse input in {@linkcode Input}. When listening to {@linkcode Mouse#BUTTON_RIGHT}, the
 * context menu is disabled. When mapping {@linkcode Mouse#WHEEL_X} or {@linkcode Mouse#WHEEL_Y}, scrolling is disabled.
 *
 * @property sensitivityX The horizontal mouse movement sensitivity
 * @property sensitivityY The vertical mouse movement sensitivity
 * @property sensitivityScroll The scroll wheel sensitivity
 *
 * @constructor
 *
 * @see {Input}
 *
 * @author derschmale <http://www.derschmale.com>
 */
function Mouse()
{
	InputPlugin.call(this);

	this.sensitivityX = 1;
	this.sensitivityY = -1;	 // invert by default
	this.sensitivityWheel = -.0035; // invert by default for zooming

	this._onMouseMove = this._onMouseMove.bind(this);
	this._onMouseDown = this._onMouseDown.bind(this);
	this._onMouseWheel = this._onMouseWheel.bind(this);
	this._onMouseUp = this._onMouseUp.bind(this);
	this._onMouseEnter = this._onMouseEnter.bind(this);
	this._onMouseLeave = this._onMouseLeave.bind(this);

	this._previousX = undefined;
	this._previousY = undefined;
	this._mouseX = undefined;
	this._mouseY = undefined;
	this._wheelX = null;
	this._wheelY = null;

	this._buttonMask = 0;
}

/**
 * The axis name for when the mouse moves horizontally over the canvas
 */
Mouse.MOVE_X = 0;

/**
 * The axis name for when the mouse moves vertically over the canvas
 */
Mouse.MOVE_Y = 1;

/**
 * The left button name
 */
Mouse.BUTTON_LEFT = 2;

/**
 * The right button name
 */
Mouse.BUTTON_RIGHT = 3;

/**
 * The middle (usually scroll) button name
 */
Mouse.BUTTON_MIDDLE = 4;

/**
 * The axis name when the horizontal scroll wheel moves
 */
Mouse.WHEEL_X = 5;

/**
 * The axis name when the vertical scroll wheel moves
 */
Mouse.WHEEL_Y = 6;

/**
 * The axis name for the mouse position on the canvas. 0 means all the way left, 1 means all the way right.
 */
Mouse.POS_X = 7;

/**
 * The axis name for the mouse position on the canvas. 0 means all the way to the top, 1 means all the way to the bottom.
 */
Mouse.POS_Y = 8;

/**
 * The axis name for when the mouse moves over the canvas with the left mouse button down
 */
Mouse.DRAG_X = 9;

/**
 * The axis name for when the mouse moves over the canvas with the left mouse button down
 */
Mouse.DRAG_Y = 10;

Mouse.prototype = Object.create(InputPlugin.prototype);

// maps event buttons to our buttons
var BUTTON_MAP = {
	0: Mouse.BUTTON_LEFT,
	1: Mouse.BUTTON_MIDDLE,
	2: Mouse.BUTTON_RIGHT
};

/**
 * @ignore
 */
Mouse.prototype.onEnabled = function()
{
	onPreFrame.bind(this._onPreFrame, this);
	document.addEventListener("mousemove", this._onMouseMove); // mouse can move over the document
	META.TARGET_CANVAS.addEventListener("mouseenter", this._onMouseEnter);
	META.TARGET_CANVAS.addEventListener("mouseleave", this._onMouseLeave);
	META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
	document.addEventListener("mouseup", this._onMouseUp);		// mouse can go up over the document
	META.TARGET_CANVAS.addEventListener("wheel", this._onMouseWheel);
};

/**
 * @ignore
 */
Mouse.prototype.onDisabled = function()
{
	onPreFrame.unbind(this._onPreFrame);
	document.removeEventListener("mousemove", this._onMouseMove);
	META.TARGET_CANVAS.removeEventListener("mouseenter", this._onMouseEnter);
	META.TARGET_CANVAS.removeEventListener("mouseleave", this._onMouseLeave);
	META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
	document.removeEventListener("mouseup", this._onMouseUp);
	META.TARGET_CANVAS.removeEventListener("wheel", this._onMouseWheel);

	document.body.oncontextmenu = null;
};

/**
 * @inheritDoc
 */
Mouse.prototype.map = function(buttonOrAxis, actionName)
{
	InputPlugin.prototype.map.call(this, buttonOrAxis, actionName);

	// disable context menu
	if (buttonOrAxis === Mouse.BUTTON_RIGHT)
		document.body.oncontextmenu = function() { return false; };
};

/**
 * @inheritDoc
 */
Mouse.prototype.unmap = function(buttonOrAxis)
{
	InputPlugin.prototype.unmap.call(this, buttonOrAxis);

	// disable context menu
	if (buttonOrAxis === Mouse.BUTTON_RIGHT)
		document.body.oncontextmenu = null;
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseDown = function(event)
{
	this._buttonMask = event.buttons;
	var button = BUTTON_MAP[event.button];
	if (!button) return;
	this.setValue(button, 1);
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseUp = function(event)
{
	this._buttonMask = event.buttons;
	var button = BUTTON_MAP[event.button];
	if (button)
		this.setValue(button, 0);
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseMove = function(event)
{
	this._updatePos(event.clientX, event.clientY);
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._updatePos = function(x, y)
{
	var rect = META.TARGET_CANVAS.getBoundingClientRect();

	// we're measuring mouse move over the whole document, but need the coordinates relative to the canvas
	// clamp to 0, 1 so we don't register moves outside the canvas (need to listen to moves over the document so it
	// won't get blocked by other DOM elements)
	this._mouseX = MathX.saturate((x - rect.left) / rect.width);
	this._mouseY = MathX.saturate((y - rect.top) / rect.height);
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onPreFrame = function()
{
	var mouseX = this._mouseX;
	var mouseY = this._mouseY;
	var aspect = META.TARGET_CANVAS.width / META.TARGET_CANVAS.height;

	if (this._previousX !== undefined) {
		var dx = (mouseX - this._previousX) * this.sensitivityX;
		var dy = (mouseY - this._previousY) * this.sensitivityY;

		this.setValue(Mouse.MOVE_X, dx * aspect);
		this.setValue(Mouse.MOVE_Y, dy);

		var isDown = this._buttonMask & 1;
		if (isDown) {
			this.setValue(Mouse.DRAG_X, dx * aspect);
			this.setValue(Mouse.DRAG_Y, dy);
		}
		else {
			this.setValue(Mouse.DRAG_X, 0);
			this.setValue(Mouse.DRAG_Y, 0);
		}
	}

	this._previousX = mouseX;
	this._previousY = mouseY;

	this.setValue(Mouse.POS_X, mouseX);
	this.setValue(Mouse.POS_Y, mouseY);

	this.setValue(Mouse.WHEEL_X, this._wheelX * this.sensitivityWheel);
	this.setValue(Mouse.WHEEL_Y, this._wheelY * this.sensitivityWheel);

	this._wheelX = 0;
	this._wheelY = 0;
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseLeave = function(event)
{
	this._updatePos(event.clientX, event.clientY);
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseEnter = function(event)
{
	this._updatePos(event.clientX, event.clientY);

	var buttonMask = this._buttonMask;
	var newButtonMask = event.buttons;

	// check if a button went "up" while not over the canvas
	if (((buttonMask & 1) !== 0) && ((newButtonMask & 1) === 0))
		this.setValue(Mouse.BUTTON_LEFT, 0);

	if (((buttonMask & 2) !== 0) && ((newButtonMask & 2) === 0))
		this.setValue(Mouse.BUTTON_RIGHT, 0);

	if (((buttonMask & 4) !== 0) && ((newButtonMask & 4) === 0))
		this.setValue(Mouse.BUTTON_MIDDLE, 0);

	this._buttonMask = newButtonMask;
};

/**
 * @ignore
 * @private
 */
Mouse.prototype._onMouseWheel = function(event)
{
	if (!(this.isMapped(Mouse.WHEEL_X) || this.isMapped(Mouse.WHEEL_Y))) return;

	// sadly, we're limited to binary scroll information, because Firefox broadcasts the scroll distance in lines, which
	// is too hairy to convert.
	this._wheelX += MathX.sign(event.deltaX);
	this._wheelY += MathX.sign(event.deltaY);

	event.preventDefault();
};

export {Mouse};