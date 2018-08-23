import {InputPlugin} from "./InputPlugin";
import {META, onPreFrame} from "../Helix";
import {MathX} from "../math/MathX";

/**
 * @classdesc
 *
 * The MouseLock class allows mapping mouse input to named actions, locking the mouse pointer. Before the pointer can be
 * locked, the canvas must be clicked.
 *
 * @property sensitivityX The horizontal mouse movement sensitivity
 * @property sensitivityY The vertical mouse movement sensitivity
 * @property sensitivityScroll The scroll wheel sensitivity
 *
 * @constructor
 */
function MouseLock()
{
	InputPlugin.call(this);

	this.sensitivityX = 1;
	this.sensitivityY = -1;	 // invert by default
	this.sensitivityWheel = -.0035; // invert by default for zooming

	this._onMouseMove = this._onMouseMove.bind(this);
	this._onMouseDown = this._onMouseDown.bind(this);
	this._onMouseWheel = this._onMouseWheel.bind(this);
	this._onMouseUp = this._onMouseUp.bind(this);
    this._onCanvasClick = this._onCanvasClick.bind(this);

	this._wheelX = null;
	this._wheelY = null;
	this._movementX = null;
	this._movementY = null;
}

/**
 * The axis name for when the mouse moves horizontally over the canvas
 */
MouseLock.MOVE_X = 0;

/**
 * The axis name for when the mouse moves vertically over the canvas
 */
MouseLock.MOVE_Y = 1;

/**
 * The left button name
 */
MouseLock.BUTTON_LEFT = 2;

/**
 * The right button name
 */
MouseLock.BUTTON_RIGHT = 3;

/**
 * The middle (usually scroll) button name
 */
MouseLock.BUTTON_MIDDLE = 4;

/**
 * The axis name when the horizontal scroll wheel moves
 */
MouseLock.WHEEL_X = 5;

/**
 * The axis name when the vertical scroll wheel moves
 */
MouseLock.WHEEL_Y = 6;


MouseLock.prototype = Object.create(InputPlugin.prototype);

// maps event buttons to our buttons
var BUTTON_MAP = {
	0: MouseLock.BUTTON_LEFT,
	1: MouseLock.BUTTON_MIDDLE,
	2: MouseLock.BUTTON_RIGHT
};


/**
 * @ignore
 */
MouseLock.prototype.onEnabled = function()
{
    META.TARGET_CANVAS.addEventListener("click", this._onCanvasClick);

	onPreFrame.bind(this._onPreFrame, this);
	document.addEventListener("mousemove", this._onMouseMove); // mouse can move over the document
	META.TARGET_CANVAS.addEventListener("mousedown", this._onMouseDown);
	document.addEventListener("mouseup", this._onMouseUp);		// mouse can go up over the document
	META.TARGET_CANVAS.addEventListener("wheel", this._onMouseWheel);
};

/**
 * @ignore
 */
MouseLock.prototype.onDisabled = function()
{
    META.TARGET_CANVAS.removeEventListener("click", this._onCanvasClick);
    document.exitPointerLock();

	onPreFrame.unbind(this._onPreFrame);
	document.removeEventListener("mousemove", this._onMouseMove);
	META.TARGET_CANVAS.removeEventListener("mousedown", this._onMouseDown);
	document.removeEventListener("mouseup", this._onMouseUp);
	META.TARGET_CANVAS.removeEventListener("wheel", this._onMouseWheel);
};

MouseLock.prototype._onCanvasClick = function()
{
    META.TARGET_CANVAS.requestPointerLock = META.TARGET_CANVAS.requestPointerLock || META.TARGET_CANVAS.mozRequestPointerLock;
    META.TARGET_CANVAS.requestPointerLock();
};

/**
 * @ignore
 * @private
 */
MouseLock.prototype._onMouseDown = function(event)
{
	var button = BUTTON_MAP[event.button];
	if (!button) return;
	this.setValue(button, 1);
};

/**
 * @ignore
 * @private
 */
MouseLock.prototype._onMouseUp = function(event)
{
	var button = BUTTON_MAP[event.button];
	if (button)
		this.setValue(button, 0);
};

/**
 * @ignore
 * @private
 */
MouseLock.prototype._onMouseMove = function(event)
{
    var rect = META.TARGET_CANVAS.getBoundingClientRect();

    // we're measuring mouse move over the whole document, but need the coordinates relative to the canvas
    // clamp to 0, 1 so we don't register moves outside the canvas (need to listen to moves over the document so it
    // won't get blocked by other DOM elements)
    this._movementX = event.movementX / rect.width;
    this._movementY = event.movementY / rect.height;
};

MouseLock.prototype._onPreFrame = function()
{
	var canvas = META.TARGET_CANVAS;
	if (document.pointerLockElement !== canvas) return;
	var aspect = canvas.width / canvas.height;

	this.setValue(MouseLock.MOVE_X, this._movementX * aspect * this.sensitivityX);
	this.setValue(MouseLock.MOVE_Y, this._movementY * this.sensitivityY);

	this._movementX = 0;
    this._movementY = 0;

	this.setValue(MouseLock.WHEEL_X, this._wheelX * this.sensitivityWheel);
	this.setValue(MouseLock.WHEEL_Y, this._wheelY * this.sensitivityWheel);

	this._wheelX = 0;
	this._wheelY = 0;
};

MouseLock.prototype._onMouseWheel = function(event)
{
	if (!(this.isMapped(MouseLock.WHEEL_X) || this.isMapped(MouseLock.WHEEL_Y))) return;

	// sadly, we're limited to binary scroll information, because Firefox broadcasts the scroll distance in lines, which
	// is too hairy to convert.
	this._wheelX += MathX.sign(event.deltaX);
	this._wheelY += MathX.sign(event.deltaY);

	event.preventDefault();
};

export {MouseLock};