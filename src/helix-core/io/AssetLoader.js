import {Signal} from "../core/Signal";
import {FileUtils} from "./FileUtils";
import {URLLoader} from "./URLLoader";
import {Importer} from "./Importer";

/**
 * @classdesc
 * AssetLoader allows loading of any sort of asset. It can be used to load several assets, but onComplete and onFail will be called for each.
 * @param ImporterType ImporterType The type of importer to use for the asset. For example: JPG, HCM (material), OBJ, ... Do NOT pass in an instance, just the class name!
 * @constructor
 *
 * @author derschmale <http://www.derschmale.com>
 */
function AssetLoader(ImporterType)
{
    // this can either be listened to, or overwritten by a function
    this.onComplete = new Signal();
    this.onFail = new Signal();

    /**
     * Key/value pairs that allows replacing file names with new ones.
     */
    this.fileMap = {};

    /**
     * Key/value pairs that specify options to be passed on to the Importers. See the importer documentation for details
     * on which options can be set.
     */
    this.options = {};

    this._headers = {};

    this._importerType = ImporterType;

    /**
     * Allow setting a cross-origin string when loading images.
     */
    this.crossOrigin = undefined;
}

AssetLoader.prototype =
{
    /**
     * Set custom http request headers.
     * @param name The name of the header.
     * @param value The value of the header.
     */
    setRequestHeader: function(name, value)
    {
        this._headers[name] = value;
    },

    /**
     * Loads the asset.
     * @param filename The filename/url to load.
     * @param [target] An optional empty target asset. This allows lazy loading.
     * @returns {*} Immediately returns an empty version of the assets that will be populated eventually during parsing.
     */
    load: function (filename, target)
    {
        function fail(code) {
            console.warn("Failed loading " + filename + ". Error code: " + code);
            if (this.onFail) {
                if (this.onFail instanceof Signal)
                    this.onFail.dispatch(code);
                else
                    this.onFail(code);
            }
        }

        var importer = new this._importerType();
        target = target || importer.createContainer();
        importer.onComplete = this.onComplete;
        importer.onFail = this.onFail;
        importer.fileMap = this.fileMap;
        importer.options = this.options;
        var file = FileUtils.extractPathAndFilename(filename);
        importer.path = file.path;
        importer.filename = file.filename;

        if (importer.dataType === Importer.TYPE_IMAGE) {
            var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");
            image.crossOrigin = this.options.crossOrigin;
            image.addEventListener("load", function() {
                importer.parse(image, target);
            });

            image.addEventListener("error", function() {
                console.warn("Failed loading texture '" + filename + "'");
                fail.call(this);
            });
            image.src = filename;
        }
        else {
            var self = this;
            var urlLoader = new URLLoader(this._headers);
            urlLoader.type = importer.dataType;

            urlLoader.onComplete = function (data)
            {
                importer.parse(data, target);
            };

            urlLoader.onError = function (code)
            {
                fail.call(self, code);
            };

            urlLoader.load(filename);
        }

        return target;
    }
};

export { AssetLoader };