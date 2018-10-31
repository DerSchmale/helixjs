export var ShaderUtils = {
	processDefines: function(defines)
	{
		var defineString = "";

		if (!defines) return defineString;

		for (var key in defines) {
			if (defines.hasOwnProperty(key)) {
				defineString += "#ifndef " + key + "\n";
				defineString += "#define " + key + " " + defines[key] + "\n";
				defineString += "#endif\n";
			}
		}

		return defineString
	}
};