/**
 *
 * Implementation details: every button or axis has an integer index from an enum.
 *
 * @ignore
 */
function InputPlugin()
{
	this._mapping = [];
	this._input = null;
}

InputPlugin.prototype =
{
	/**
	 * @ignore
	 */
	onEnabled: function()
	{
		throw new Error("Abstract method called!");
	},

	/**
	 * @ignore
	 */
	onDisabled: function()
	{
		throw new Error("Abstract method called!");
	},

	/**
	 * Maps a given button or axis to a given action name. This value for this action name can be listened to or queried
	 * from {@linkcode Controller}.
	 *
	 * @param buttonOrAxis
	 * @param actionName
	 */
	map: function(buttonOrAxis, actionName)
	{
		this._mapping[buttonOrAxis] = actionName;
	},

	/**
	 * Removes the mapping of a controller
	 *
	 * @param buttonOrAxis The button or axis. This is normally an enumerator on the Input.
	 */
	unmap: function(buttonOrAxis)
	{
		this._mapping[buttonOrAxis] = undefined;
	},

	/**
	 * Returns whether or not the button or axis is mapped.
	 */
	isMapped: function(buttonOrAxis)
	{
		return !!this._mapping[buttonOrAxis];
	},

	/**
	 * Called by concrete subclasses
	 * @ignore
	 */
	setValue: function(buttonOrAxis, value)
	{
		if (!this._input) return;
		var action = this._mapping[buttonOrAxis];
		if (action)
			this._input.setActionValue(action, value);
	},

	/**
	 * @ignore
	 * @private
	 */
	_setInput: function(value)
	{
		console.assert(!!this._input !== !!value, "Cannot enable or disable inputs twice!");
		this._input = value;

		if (value)
			this.onEnabled();
		else
			this.onDisabled();
	}
};

export { InputPlugin }