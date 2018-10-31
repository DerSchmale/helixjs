/**
 * ShaderLibrary is an object that will store shader code processed by the build process: contents of glsl files stored
 * in the glsl folder will be stored here and can be retrieved using their original filename.
 *
 * @ignore
 * @author derschmale <http://www.derschmale.com>
 */
import {ShaderUtils} from "../utils/ShaderUtils";

export var ShaderLibrary = {
    _files: {},
    /**
     * Retrieves the shader code for a given filename.
     * @param filename The filename of the glsl code to retrieve
     * @param defines (Optional) An object containing variable names that need to be defined with the given value.
     * This should not be used for macros, which should be explicitly prepended
     * @param extensions (Optional) An array of extensions to be required
     * @returns A string containing the shader code from the files with defines prepended
     */
    get: function(filename, defines)
    {
        return ShaderUtils.processDefines(defines) + ShaderLibrary._files[filename];
    }
};
