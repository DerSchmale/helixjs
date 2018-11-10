import {DEFAULTS} from "../Helix";
import {RectMesh} from "../mesh/RectMesh";

export var BlitTexture =
{
    execute: function(tex)
    {
		DEFAULTS.COPY_SHADER.execute(tex);
    }
};