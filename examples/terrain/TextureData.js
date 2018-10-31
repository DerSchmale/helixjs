function TextureData(map)
{
	this.width = map.width;
	this.height = map.height;
	this._rgbaEnc = map.dataType === HX.DataType.FLOAT || map.dataType === HX.DataType.HALF_FLOAT;

	this._data = HX.TextureUtils.getData(map, this._rgbaEnc? "x" : undefined);
}

TextureData.prototype = {
	getValue: function (x, y, comp)
	{
		if (this._rgbaEnc && comp) {
			throw new Error("Cannot select components from rgbe encoded data");
		}
		x = (x / worldSize + .5) * this.width;
		y = (y / worldSize + .5) * this.height;
		var xi = Math.floor(x);
		var yi = Math.floor(y);
		var xf = x - xi;
		var yf = y - yi;
		var tl = this._getHeightPixel(xi, yi, comp);
		var tr = this._getHeightPixel(xi + 1, yi, comp);
		var bl = this._getHeightPixel(xi, yi + 1, comp);
		var br = this._getHeightPixel(xi + 1, yi + 1, comp);
		var t = HX.MathX.lerp(tl, tr, xf);
		var b = HX.MathX.lerp(bl, br, xf);
		return HX.MathX.lerp(t, b, yf);
	},

	_getHeightPixel: function (xi, yi, comp)
	{
		if (xi < 0) xi = 0;
		if (yi < 0) yi = 0;
		if (xi >= this.width) xi = this.width - 1;
		if (yi >= this.height) yi = this.height - 1;

		if (this._rgbaEnc) {
			var i = (xi + yi * this.width) << 2;
			return (this._data[i] + this._data[i + 1] / 255 + this._data[i + 2] / 65025.0 + this._data[i + 3] / 16581375.0) / 0xff;
		}
		else
			return this._data[((xi + yi * this.width) << 2) + comp];
	}
};