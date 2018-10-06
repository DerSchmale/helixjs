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
    this.onProgress = new Signal();
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
	 * @param file The filename/url to load, or a File object.
	 * @param [target] An optional empty target asset. This allows lazy loading.
     * @returns {*} Immediately returns an empty version of the assets that will be populated eventually during parsing.
     */
    load: function (file, target)
    {
        var importer = new this._importerType();
        importer.onComplete = this.onComplete;
        importer.onProgress = this.onProgress;
        importer.onFail = this.onFail;
        importer.fileMap = this.fileMap;
        importer.options = this.options;

        file instanceof Blob?
			this._importFromFile(file, target, importer) :
            this._importFromFilename(file, target, importer);

        return target;
    },

	_fail: function(code) {
		console.warn("Failed loading asset. Error code: " + code);
		if (this.onFail) {
			if (this.onFail instanceof Signal)
				this.onFail.dispatch(code);
			else
				this.onFail(code);
		}
	},

	_importFromFile: function(file, target, importer)
    {
        var fileReader = new FileReader();
		fileReader.onerror = function(code) {
			self._fail.call(self, code);
		};


		switch (importer.dataType) {
            case Importer.TYPE_TEXT:
				fileReader.onload = function() {
					importer.parse(fileReader.result, target);
				};
				fileReader.readAsText(file);
				break;
            case Importer.TYPE_BINARY:
				fileReader.onload = function() {
					importer.parse(new DataView(fileReader.result), target);
				};
				fileReader.readAsArrayBuffer(file);
                break;
            case Importer.TYPE_IMAGE:
				var image = document.createElementNS("http://www.w3.org/1999/xhtml", "img");

				fileReader.onload = function() {
					image.src = fileReader.result;
					importer.parse(image, target);
				};

				fileReader.readAsDataURL(file);
                break;
        }
    },

    _importFromFilename: function(filename, target, importer)
    {
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
				console.warn("Failed loading asset '" + filename + "'");
				self._fail.call(self);
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
				self._fail.call(self, code);
			};

			urlLoader.load(filename);
		}
    }
};

export { AssetLoader };