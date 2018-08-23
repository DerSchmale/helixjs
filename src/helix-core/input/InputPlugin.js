/**
 * Implementation details: every button or axis has an integer index from an enum.
 *
 * @ignore
 */
function InputPlugin()
{
	this._mapping = [];
	this._input = null;
    this._values = {};
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
	 * Maps a button or axis to an action. The value for this action name can be listened to or queried from {@linkcode Input}.
	 *
	 * @param buttonOrAxis The button or axis to map to an action. The value of this is one of the subclasses' enum properties.
	 * @param actionName The name of the action on the {@Input} that will be targeted by the button/axis.
	 */
	map: function(buttonOrAxis, actionName)
	{
		this._mapping[buttonOrAxis] = actionName;
	},

	/**
	 * Removes the mapping of a button or axis.
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

        // every plugin needs to check against their own values, or it could constantly overwrite other input plugins:
		var oldValue = this._values[buttonOrAxis];
		if (oldValue === value) return;
		this._values[buttonOrAxis] = value;

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